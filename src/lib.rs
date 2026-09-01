use std::{
    collections::{HashMap, HashSet},
    env,
    net::{IpAddr, SocketAddr},
    path::{Path as FilePath, PathBuf},
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use axum::{
    body::Body,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    http::{header, HeaderValue, Request, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use futures_util::{SinkExt, StreamExt};
use rand::{distributions::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{
    migrate::Migrator,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
    Row, SqlitePool,
};
use tokio::sync::{broadcast, Mutex};
use tower_http::{
    services::{ServeDir, ServeFile},
    set_header::SetResponseHeaderLayer,
    trace::TraceLayer,
};

pub const BUILD_SHA: &str = match option_env!("BUILD_SHA") {
    Some(value) => value,
    None => "dev",
};

const ROOM_TTL: Duration = Duration::from_secs(2 * 60 * 60);
const RATE_WINDOW: Duration = Duration::from_secs(1);
const RATE_RETENTION: Duration = Duration::from_secs(60);
const RATE_BURST: u32 = 40;
const DURABLE_SQLITE_VFS: &str = "unix-none";
static MIGRATOR: Migrator = sqlx::migrate!();

type BoxError = Box<dyn std::error::Error + Send + Sync>;
type SessionKey = (String, String, String);
type RoomSessions = Arc<Mutex<HashMap<SessionKey, usize>>>;

#[derive(Clone)]
pub struct AppState {
    database: SqlitePool,
    channels: Arc<Mutex<HashMap<String, broadcast::Sender<String>>>>,
    sessions: RoomSessions,
    rejoinable_companions: Arc<Mutex<HashSet<(String, String)>>>,
    room_ttl: Duration,
}

struct StoredRoom {
    host_token: String,
    companion_token: Option<String>,
    expires_at_ms: i64,
}

#[derive(Serialize)]
struct RoomCreated {
    code: String,
    host_token: String,
    expires_in_seconds: u64,
}

#[derive(Serialize)]
struct RoomJoined {
    companion_token: String,
}

#[derive(Deserialize)]
struct SocketQuery {
    role: String,
    token: String,
}

pub fn database_path() -> PathBuf {
    if let Some(path) = env::var_os("RELAY_DATABASE_PATH") {
        return PathBuf::from(path);
    }

    let durable_directory = FilePath::new("/data");
    if durable_directory.is_dir() {
        return durable_directory.join("relay.sqlite3");
    }

    env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(FilePath::to_path_buf))
        .unwrap_or_else(|| PathBuf::from("."))
        .join("relay.sqlite3")
}

pub async fn app(dist_dir: impl Into<String>) -> Result<Router, BoxError> {
    app_with_database_path(dist_dir, database_path(), ROOM_TTL).await
}

fn sqlite_connect_options(
    database_path: &FilePath,
    durable_network_mount: bool,
) -> SqliteConnectOptions {
    let options = SqliteConnectOptions::new()
        .filename(database_path)
        .create_if_missing(true)
        // WAL relies on a shared-memory sidecar and is not safe on the Azure
        // Files SMB mount used for /data. A rollback journal keeps locking in
        // the database directory and works with the singleton deployment.
        .journal_mode(SqliteJournalMode::Delete)
        .synchronous(SqliteSynchronous::Full)
        // A retiring revision can hold the database briefly while Azure moves
        // traffic. Wait for that lock instead of crash-looping the new one.
        .busy_timeout(Duration::from_secs(30));

    if durable_network_mount {
        // Azure Files does not provide the POSIX advisory-lock behavior SQLite
        // expects. `unix-none` is safe only because this process uses one pool
        // connection and the deployment stops every old revision before a new
        // one starts. Keep that rollout invariant in deploy-containerapp.sh.
        options.vfs(DURABLE_SQLITE_VFS)
    } else {
        options
    }
}

async fn app_with_database_path(
    dist_dir: impl Into<String>,
    database_path: impl AsRef<FilePath>,
    room_ttl: Duration,
) -> Result<Router, BoxError> {
    let database_path = database_path.as_ref();
    if let Some(parent) = database_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let options = sqlite_connect_options(database_path, database_path.starts_with("/data"));
    let database = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await?;
    MIGRATOR.run(&database).await?;
    let started_at_ms = now_millis();
    sqlx::query("DELETE FROM rooms WHERE expires_at_ms <= ?")
        .bind(started_at_ms)
        .execute(&database)
        .await?;
    // Keep companion tokens across restarts so an open browser can reconnect
    // to the same room. A fresh join may rotate an inactive token below.
    sqlx::query("DELETE FROM rate_limits WHERE window_started_ms <= ?")
        .bind(started_at_ms - duration_millis(RATE_RETENTION))
        .execute(&database)
        .await?;
    let active_rooms = sqlx::query("SELECT code, companion_token, expires_at_ms FROM rooms")
        .fetch_all(&database)
        .await?;
    let active_rates = sqlx::query("SELECT client, window_started_ms FROM rate_limits")
        .fetch_all(&database)
        .await?;

    let rejoinable_companions = active_rooms
        .iter()
        .filter_map(|room| {
            room.get::<Option<String>, _>("companion_token")
                .map(|token| (room.get("code"), token))
        })
        .collect();
    let state = AppState {
        database,
        channels: Arc::new(Mutex::new(HashMap::new())),
        sessions: Arc::new(Mutex::new(HashMap::new())),
        rejoinable_companions: Arc::new(Mutex::new(rejoinable_companions)),
        room_ttl,
    };
    for room in active_rooms {
        schedule_room_expiry(state.clone(), room.get("code"), room.get("expires_at_ms"));
    }
    for rate in active_rates {
        let window_started_ms = rate.get("window_started_ms");
        schedule_rate_expiry(
            state.database.clone(),
            rate.get("client"),
            window_started_ms,
            window_started_ms + duration_millis(RATE_RETENTION),
        );
    }
    Ok(app_with_state(dist_dir, state))
}

fn app_with_state(dist_dir: impl Into<String>, state: AppState) -> Router {
    let dist_dir = dist_dir.into();
    let api = Router::new()
        .route("/api/rooms", post(create_room))
        .route("/api/rooms/{code}/join", post(join_room))
        .route("/api/rooms/{code}/socket", get(room_socket))
        .layer(middleware::from_fn_with_state(state.clone(), rate_limit));

    Router::new()
        .route("/health", get(health))
        .merge(api)
        .fallback_service(
            ServeDir::new(&dist_dir)
                .append_index_html_on_directories(true)
                .fallback(ServeFile::new(format!("{dist_dir}/index.html"))),
        )
        .layer(middleware::from_fn(mark_unknown_routes_not_found))
        .layer(middleware::from_fn(cache_headers))
        .layer(SetResponseHeaderLayer::if_not_present(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            header::REFERRER_POLICY,
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            header::CONTENT_SECURITY_POLICY,
            HeaderValue::from_static(
                "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' ws: wss:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
            ),
        ))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn mark_unknown_routes_not_found(request: Request<Body>, next: Next) -> Response {
    let path = request.uri().path().to_owned();
    let mut response = next.run(request).await;
    if response.status() == StatusCode::OK && !is_known_frontend_route(&path) {
        *response.status_mut() = StatusCode::NOT_FOUND;
    }
    response
}

fn is_known_frontend_route(path: &str) -> bool {
    path.starts_with("/api/")
        || path == "/health"
        || matches!(
            path,
            "/" | "/demo" | "/host" | "/join" | "/privacy" | "/terms"
        )
        || path
            .strip_prefix("/join/")
            .is_some_and(|code| normalized_code(code).is_ok())
        || path.starts_with("/assets/")
        || path.starts_with("/art/")
        || matches!(
            path,
            "/favicon.svg"
                | "/apple-touch-icon.png"
                | "/manifest.webmanifest"
                | "/robots.txt"
                | "/sitemap.xml"
                | "/sw.js"
                | "/404.html"
                | "/staticwebapp.config.json"
        )
}

async fn cache_headers(request: Request<Body>, next: Next) -> Response {
    let path = request.uri().path().to_string();
    let mut response = next.run(request).await;
    let value = if path.starts_with("/assets/") {
        "public, max-age=31536000, immutable"
    } else if path.starts_with("/art/") || path.ends_with(".png") || path.ends_with(".svg") {
        "public, max-age=86400"
    } else {
        "no-cache"
    };
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static(value));
    response
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({ "status": "ok", "build_sha": BUILD_SHA }))
}

async fn create_room(State(state): State<AppState>) -> Result<Json<RoomCreated>, ApiError> {
    let now = now_millis();
    sqlx::query("DELETE FROM rooms WHERE expires_at_ms <= ?")
        .bind(now)
        .execute(&state.database)
        .await
        .map_err(ApiError::database)?;

    let host_token = random_code(32);
    let expires_at_ms = now + duration_millis(state.room_ttl);
    let code = loop {
        let candidate = random_code(6);
        let inserted = sqlx::query(
            "INSERT OR IGNORE INTO rooms (code, host_token, companion_token, expires_at_ms) VALUES (?, ?, NULL, ?)",
        )
        .bind(&candidate)
        .bind(&host_token)
        .bind(expires_at_ms)
        .execute(&state.database)
        .await
        .map_err(ApiError::database)?;
        if inserted.rows_affected() == 1 {
            break candidate;
        }
    };
    channel_for(&state, &code).await;

    let created = RoomCreated {
        code,
        host_token,
        expires_in_seconds: state.room_ttl.as_secs(),
    };
    schedule_room_expiry(state, created.code.clone(), expires_at_ms);
    Ok(Json(created))
}

async fn join_room(
    State(state): State<AppState>,
    Path(raw_code): Path<String>,
) -> Result<Json<RoomJoined>, ApiError> {
    let code = normalized_code(&raw_code)?;
    let token = random_code(32);
    let updated = sqlx::query(
        "UPDATE rooms SET companion_token = ? WHERE code = ? AND companion_token IS NULL AND expires_at_ms > ?",
    )
    .bind(&token)
    .bind(&code)
    .bind(now_millis())
    .execute(&state.database)
    .await
    .map_err(ApiError::database)?;
    if updated.rows_affected() == 1 {
        channel_for(&state, &code).await;
        return Ok(Json(RoomJoined {
            companion_token: token,
        }));
    }

    match stored_room(&state.database, &code).await? {
        Some(room) if room.expires_at_ms > now_millis() && room.companion_token.is_some() => {
            if role_is_connected(&state, &code, "companion").await {
                return Err(ApiError::new(
                    StatusCode::CONFLICT,
                    "room_full",
                    "That room already has a companion. Ask the host for a new room.",
                ));
            }

            // The previous companion is no longer connected. Rotate its token
            // atomically so a page reload can reclaim the room, while an open
            // page can reconnect directly with its existing token.
            let previous_token = room.companion_token.expect("checked above");
            let rejoinable = state
                .rejoinable_companions
                .lock()
                .await
                .contains(&(code.clone(), previous_token.clone()));
            if !rejoinable {
                return Err(ApiError::new(
                    StatusCode::CONFLICT,
                    "room_full",
                    "That room already has a companion. Ask the host for a new room.",
                ));
            }
            let replaced = sqlx::query(
                "UPDATE rooms SET companion_token = ? WHERE code = ? AND companion_token = ? AND expires_at_ms > ?",
            )
            .bind(&token)
            .bind(&code)
            .bind(&previous_token)
            .bind(now_millis())
            .execute(&state.database)
            .await
            .map_err(ApiError::database)?;
            if replaced.rows_affected() == 1 {
                state
                    .rejoinable_companions
                    .lock()
                    .await
                    .remove(&(code.clone(), previous_token));
                channel_for(&state, &code).await;
                return Ok(Json(RoomJoined {
                    companion_token: token,
                }));
            }
            Err(ApiError::new(
                StatusCode::CONFLICT,
                "room_full",
                "That room already has a companion. Ask the host for a new room.",
            ))
        }
        Some(_) => {
            delete_room(&state, &code).await?;
            Err(room_not_found())
        }
        None => Err(room_not_found()),
    }
}

async fn room_socket(
    State(state): State<AppState>,
    Path(raw_code): Path<String>,
    Query(query): Query<SocketQuery>,
    ws: WebSocketUpgrade,
) -> Result<Response, ApiError> {
    let code = normalized_code(&raw_code)?;
    let room = stored_room(&state.database, &code)
        .await?
        .ok_or_else(room_not_found)?;
    let now = now_millis();
    if room.expires_at_ms <= now {
        delete_room(&state, &code).await?;
        return Err(room_not_found());
    }
    let valid = match query.role.as_str() {
        "host" => constant_time_eq(&query.token, &room.host_token),
        "companion" => room
            .companion_token
            .as_ref()
            .is_some_and(|token| constant_time_eq(&query.token, token)),
        _ => false,
    };
    if !valid {
        return Err(ApiError::new(
            StatusCode::UNAUTHORIZED,
            "invalid_token",
            "This room link is not valid. Join again with the room code.",
        ));
    }
    let channel = channel_for(&state, &code).await;
    let expires_after = Duration::from_millis((room.expires_at_ms - now) as u64);
    let role = query.role;
    let token = query.token;

    Ok(ws
        .on_upgrade(move |socket| {
            socket_session(socket, channel, role, token, code, expires_after, state)
        })
        .into_response())
}

async fn socket_session(
    socket: WebSocket,
    channel: broadcast::Sender<String>,
    role: String,
    token: String,
    code: String,
    expires_after: Duration,
    state: AppState,
) {
    let (mut socket_tx, mut socket_rx) = socket.split();
    let mut room_rx = channel.subscribe();
    let expiry = tokio::time::sleep(expires_after);
    tokio::pin!(expiry);
    let other_role = if role == "host" { "companion" } else { "host" };
    let other_connected = register_session(&state, &code, &role, &token).await;
    let snapshot = json!({
        "type": "presence",
        "role": other_role,
        "connected": other_connected,
    })
    .to_string();
    if socket_tx
        .send(Message::Text(snapshot.into()))
        .await
        .is_err()
    {
        let role_disconnected = unregister_session(&state, &code, &role, &token).await;
        if role == "companion" && role_disconnected {
            state
                .rejoinable_companions
                .lock()
                .await
                .insert((code, token));
        }
        return;
    }
    let joined = json!({ "type": "presence", "role": role, "connected": true }).to_string();
    let _ = channel.send(joined);

    loop {
        tokio::select! {
            _ = &mut expiry => break,
            incoming = socket_rx.next() => {
                match incoming {
                    Some(Ok(Message::Text(text))) if text.len() <= 2048 => {
                        if let Ok(value) = serde_json::from_str::<serde_json::Value>(&text) {
                            if allowed_room_message(&role, &value) {
                                let _ = channel.send(text.to_string());
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None | Some(Err(_)) => break,
                    _ => {}
                }
            }
            outgoing = room_rx.recv() => {
                match outgoing {
                    Ok(text) => {
                        if serde_json::from_str::<serde_json::Value>(&text)
                            .ok()
                            .and_then(|value| value.get("type").and_then(|kind| kind.as_str()).map(str::to_owned))
                            .as_deref() == Some("room_expired") {
                            break;
                        }
                        if socket_tx.send(Message::Text(text.into())).await.is_err() {
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(_) => break,
                }
            }
        }
    }
    let _ = socket_tx.send(Message::Close(None)).await;
    let role_disconnected = unregister_session(&state, &code, &role, &token).await;
    if role_disconnected {
        if role == "companion" {
            state
                .rejoinable_companions
                .lock()
                .await
                .insert((code.clone(), token));
        }
        let left = json!({ "type": "presence", "role": role, "connected": false }).to_string();
        let _ = channel.send(left);
    }
}

async fn register_session(state: &AppState, code: &str, role: &str, token: &str) -> bool {
    if role == "companion" {
        state
            .rejoinable_companions
            .lock()
            .await
            .remove(&(code.to_owned(), token.to_owned()));
    }
    let mut sessions = state.sessions.lock().await;
    let other_role = if role == "host" { "companion" } else { "host" };
    let other_connected = sessions.iter().any(|((room, active_role, _), count)| {
        room == code && active_role == other_role && *count > 0
    });
    *sessions
        .entry((code.to_owned(), role.to_owned(), token.to_owned()))
        .or_insert(0) += 1;
    other_connected
}

async fn unregister_session(state: &AppState, code: &str, role: &str, token: &str) -> bool {
    let mut sessions = state.sessions.lock().await;
    let key = (code.to_owned(), role.to_owned(), token.to_owned());
    if let Some(count) = sessions.get_mut(&key) {
        *count = count.saturating_sub(1);
        if *count == 0 {
            sessions.remove(&key);
        }
    }
    !sessions
        .iter()
        .any(|((room, active_role, _), count)| room == code && active_role == role && *count > 0)
}

async fn role_is_connected(state: &AppState, code: &str, role: &str) -> bool {
    state
        .sessions
        .lock()
        .await
        .iter()
        .any(|((room, active_role, _), count)| room == code && active_role == role && *count > 0)
}

async fn stored_room(database: &SqlitePool, code: &str) -> Result<Option<StoredRoom>, ApiError> {
    sqlx::query("SELECT host_token, companion_token, expires_at_ms FROM rooms WHERE code = ?")
        .bind(code)
        .fetch_optional(database)
        .await
        .map(|row| {
            row.map(|row| StoredRoom {
                host_token: row.get("host_token"),
                companion_token: row.get("companion_token"),
                expires_at_ms: row.get("expires_at_ms"),
            })
        })
        .map_err(ApiError::database)
}

async fn channel_for(state: &AppState, code: &str) -> broadcast::Sender<String> {
    let mut channels = state.channels.lock().await;
    channels
        .entry(code.to_owned())
        .or_insert_with(|| broadcast::channel(128).0)
        .clone()
}

async fn delete_room(state: &AppState, code: &str) -> Result<(), ApiError> {
    sqlx::query("DELETE FROM rooms WHERE code = ?")
        .bind(code)
        .execute(&state.database)
        .await
        .map_err(ApiError::database)?;
    state.channels.lock().await.remove(code);
    state
        .rejoinable_companions
        .lock()
        .await
        .retain(|(room, _)| room != code);
    Ok(())
}

fn schedule_room_expiry(state: AppState, code: String, expires_at_ms: i64) {
    tokio::spawn(async move {
        let delay = expires_at_ms.saturating_sub(now_millis()) as u64;
        tokio::time::sleep(Duration::from_millis(delay)).await;
        let deleted = sqlx::query("DELETE FROM rooms WHERE code = ? AND expires_at_ms = ?")
            .bind(&code)
            .bind(expires_at_ms)
            .execute(&state.database)
            .await
            .map(|result| result.rows_affected() == 1)
            .unwrap_or(false);
        let channel = state.channels.lock().await.remove(&code);
        state
            .rejoinable_companions
            .lock()
            .await
            .retain(|(room, _)| room != &code);
        if deleted {
            if let Some(channel) = channel {
                let _ = channel.send(json!({ "type": "room_expired" }).to_string());
            }
        }
    });
}

fn room_not_found() -> ApiError {
    ApiError::new(
        StatusCode::NOT_FOUND,
        "room_not_found",
        "That room is not open. Check the code with the host.",
    )
}

fn allowed_room_message(role: &str, value: &serde_json::Value) -> bool {
    let Some(kind) = value.get("type").and_then(|item| item.as_str()) else {
        return false;
    };
    match (role, kind) {
        ("companion", "tap") => {
            value.get("at").and_then(|item| item.as_i64()).is_some()
                && value.get("round").and_then(|item| item.as_u64()).is_some()
                && value.get("tap_id").and_then(|item| item.as_u64()).is_some()
        }
        ("companion", "score_ack") => valid_score_message(value),
        ("host", "beat") => value.get("at").and_then(|item| item.as_i64()).is_some(),
        ("host", "round_start") => {
            value
                .get("bpm")
                .and_then(|item| item.as_u64())
                .is_some_and(|bpm| (40..=240).contains(&bpm))
                && value
                    .get("duration")
                    .and_then(|item| item.as_u64())
                    .is_some_and(|seconds| (1..=3600).contains(&seconds))
        }
        ("host", "score") => valid_score_message(value),
        ("host", "round_end") => value
            .get("score")
            .and_then(|item| item.as_u64())
            .is_some_and(|score| score <= 100),
        _ => false,
    }
}

fn valid_score_message(value: &serde_json::Value) -> bool {
    value
        .get("score")
        .and_then(|item| item.as_u64())
        .is_some_and(|score| score <= 100)
        && value.get("round").and_then(|item| item.as_u64()).is_some()
        && value
            .get("tap_count")
            .and_then(|item| item.as_u64())
            .is_some()
}

async fn rate_limit(State(state): State<AppState>, request: Request<Body>, next: Next) -> Response {
    let client = request
        .headers()
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(forwarded_client_identity)
        .filter(|value| !value.is_empty())
        .unwrap_or("direct")
        .to_string();

    // Capture arrival time before waiting for SQLite's single writer. This
    // makes a simultaneous 45-request burst one window even on slower durable
    // storage, while the transaction keeps the allowance exact across pools.
    let requested_at_ms = now_millis();
    let (count, window_started_ms) =
        match consume_rate_slot(&state.database, &client, requested_at_ms).await {
            Ok(result) => result,
            Err(error) => return ApiError::database(error).into_response(),
        };
    if count == 1 {
        schedule_rate_expiry(
            state.database.clone(),
            client,
            window_started_ms,
            window_started_ms + duration_millis(RATE_RETENTION),
        );
    }
    if count > RATE_BURST {
        let mut response = ApiError::new(
            StatusCode::TOO_MANY_REQUESTS,
            "rate_limited",
            "Too many requests arrived at once. Wait one second and try again.",
        )
        .into_response();
        response
            .headers_mut()
            .insert(header::RETRY_AFTER, HeaderValue::from_static("1"));
        return response;
    }
    next.run(request).await
}

async fn consume_rate_slot(
    database: &SqlitePool,
    client: &str,
    requested_at_ms: i64,
) -> Result<(u32, i64), sqlx::Error> {
    let row = sqlx::query(
        "INSERT INTO rate_limits (client, window_started_ms, request_count) VALUES (?, ?, 1) \
         ON CONFLICT(client) DO UPDATE SET \
           request_count = CASE WHEN ? - rate_limits.window_started_ms >= ? THEN 1 ELSE rate_limits.request_count + 1 END, \
           window_started_ms = CASE WHEN ? - rate_limits.window_started_ms >= ? THEN ? ELSE rate_limits.window_started_ms END \
         RETURNING request_count, window_started_ms",
    )
    .bind(client)
    .bind(requested_at_ms)
    .bind(requested_at_ms)
    .bind(duration_millis(RATE_WINDOW))
    .bind(requested_at_ms)
    .bind(duration_millis(RATE_WINDOW))
    .bind(requested_at_ms)
    .fetch_one(database)
    .await?;
    Ok((
        row.get::<i64, _>("request_count") as u32,
        row.get("window_started_ms"),
    ))
}

fn schedule_rate_expiry(
    database: SqlitePool,
    client: String,
    window_started_ms: i64,
    expires_at_ms: i64,
) {
    tokio::spawn(async move {
        let delay = expires_at_ms.saturating_sub(now_millis()) as u64;
        tokio::time::sleep(Duration::from_millis(delay)).await;
        let _ = sqlx::query("DELETE FROM rate_limits WHERE client = ? AND window_started_ms = ?")
            .bind(client)
            .bind(window_started_ms)
            .execute(&database)
            .await;
    });
}

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(i64::MAX as u128) as i64
}

fn duration_millis(duration: Duration) -> i64 {
    duration.as_millis().min(i64::MAX as u128) as i64
}

// Azure ingress can provide the first X-Forwarded-For hop as `IP:port`.
// The port is per connection, not the client identity; retaining it would let
// one client evade the limiter by opening new connections.
fn forwarded_client_identity(value: &str) -> &str {
    let value = value.trim();
    if value.parse::<IpAddr>().is_ok() {
        return value;
    }
    if value.parse::<SocketAddr>().is_ok() {
        return value.rsplit_once(':').map_or(value, |(ip, _)| ip);
    }
    value
}

fn normalized_code(value: &str) -> Result<String, ApiError> {
    let code: String = value
        .chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .map(|character| character.to_ascii_uppercase())
        .collect();
    if code.len() == 6 {
        Ok(code)
    } else {
        Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "invalid_code",
            "A room code has six letters and numbers. Check the code and try again.",
        ))
    }
}

fn random_code(length: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .filter(|byte| !matches!(byte, b'0' | b'O' | b'1' | b'I' | b'l'))
        .take(length)
        .map(char::from)
        .collect::<String>()
        .to_ascii_uppercase()
}

fn constant_time_eq(left: &str, right: &str) -> bool {
    if left.len() != right.len() {
        return false;
    }
    left.bytes()
        .zip(right.bytes())
        .fold(0_u8, |difference, (a, b)| difference | (a ^ b))
        == 0
}

struct ApiError {
    status: StatusCode,
    code: &'static str,
    message: &'static str,
}

impl ApiError {
    fn new(status: StatusCode, code: &'static str, message: &'static str) -> Self {
        Self {
            status,
            code,
            message,
        }
    }

    fn database(error: sqlx::Error) -> Self {
        tracing::error!(error = %error, "relay database request failed");
        Self::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "relay_unavailable",
            "The relay could not save this request. Wait a moment and try again.",
        )
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(json!({ "error": self.code, "message": self.message })),
        )
            .into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request;
    use tempfile::TempDir;
    use tower::ServiceExt;

    async fn isolated_app(room_ttl: Duration) -> (Router, TempDir) {
        let directory = tempfile::tempdir().unwrap();
        let application = app_with_database_path(
            "frontend/dist",
            directory.path().join("relay.sqlite3"),
            room_ttl,
        )
        .await
        .unwrap();
        (application, directory)
    }

    async fn app_at(database_path: impl AsRef<FilePath>, room_ttl: Duration) -> Router {
        app_with_database_path("frontend/dist", database_path, room_ttl)
            .await
            .unwrap()
    }

    #[tokio::test]
    async fn creates_and_joins_a_room() {
        let (application, _storage) = isolated_app(ROOM_TTL).await;
        let create = application
            .clone()
            .oneshot(Request::post("/api/rooms").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(create.status(), StatusCode::OK);
        let bytes = axum::body::to_bytes(create.into_body(), 4096)
            .await
            .unwrap();
        let created: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        let code = created["code"].as_str().unwrap();

        let join = application
            .oneshot(
                Request::post(format!("/api/rooms/{code}/join"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(join.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn regression_p0_separate_processes_share_room_records_in_sqlite() {
        // Verification 22 reproduced an HTTP create on one process followed by
        // a companion join and WebSocket upgrade on another process. Durable
        // SQLite makes both room lookups coherent even if deployment topology
        // drifts while the singleton guard protects live broadcast fan-out.
        let storage = tempfile::tempdir().unwrap();
        let database_path = storage.path().join("relay.sqlite3");
        let creator_process = app_at(&database_path, ROOM_TTL).await;
        let created = creator_process
            .clone()
            .oneshot(Request::post("/api/rooms").body(Body::empty()).unwrap())
            .await
            .unwrap();
        let room: serde_json::Value = serde_json::from_slice(
            &axum::body::to_bytes(created.into_body(), 4096)
                .await
                .unwrap(),
        )
        .unwrap();
        let code = room["code"].as_str().unwrap();
        let token = room["host_token"].as_str().unwrap();

        let secondary_process = app_at(&database_path, ROOM_TTL).await;
        let secondary_join = secondary_process
            .clone()
            .oneshot(
                Request::post(format!("/api/rooms/{code}/join"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(
            secondary_join.status(),
            StatusCode::OK,
            "a companion routed to another process must find the durable room"
        );

        let other_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let other_address = other_listener.local_addr().unwrap();
        let other_server = tokio::spawn(async move {
            axum::serve(other_listener, secondary_process)
                .await
                .unwrap();
        });

        let secondary_result = tokio_tungstenite::connect_async(format!(
            "ws://{other_address}/api/rooms/{code}/socket?role=host&token={token}"
        ))
        .await;
        assert!(
            secondary_result.is_ok(),
            "another process using the same database must accept the room's host token"
        );
        other_server.abort();
    }

    #[tokio::test]
    async fn regression_azure_files_vfs_can_create_and_update_the_durable_schema() {
        assert_eq!(DURABLE_SQLITE_VFS, "unix-none");
        let storage = tempfile::tempdir().unwrap();
        let database_path = storage.path().join("relay.sqlite3");
        let database = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(sqlite_connect_options(&database_path, true))
            .await
            .expect("the no-lock Unix VFS must be available in the release SQLite build");
        MIGRATOR.run(&database).await.unwrap();
        sqlx::query(
            "INSERT INTO rate_limits (client, window_started_ms, request_count) VALUES (?, ?, ?)",
        )
        .bind("198.51.100.200")
        .bind(1_i64)
        .bind(1_i64)
        .execute(&database)
        .await
        .unwrap();
        let count: i64 =
            sqlx::query_scalar("SELECT request_count FROM rate_limits WHERE client = ?")
                .bind("198.51.100.200")
                .fetch_one(&database)
                .await
                .unwrap();
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn regression_azure_files_uses_rollback_journal_and_waits_for_rollout_lock() {
        // The first durable /data rollout exposed that WAL cannot initialize
        // reliably on Azure Files. Hold an exclusive rollback-journal lock as
        // a retiring revision can, then prove the next app waits and starts.
        let storage = tempfile::tempdir().unwrap();
        let database_path = storage.path().join("relay.sqlite3");
        let blocker_options = SqliteConnectOptions::new()
            .filename(&database_path)
            .create_if_missing(true)
            .journal_mode(SqliteJournalMode::Delete)
            .synchronous(SqliteSynchronous::Full)
            .busy_timeout(Duration::from_secs(2));
        let blocker = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(blocker_options)
            .await
            .unwrap();
        MIGRATOR.run(&blocker).await.unwrap();
        sqlx::query("BEGIN EXCLUSIVE")
            .execute(&blocker)
            .await
            .unwrap();

        let initializing_path = database_path.clone();
        let mut initializing = tokio::spawn(async move {
            app_with_database_path("frontend/dist", initializing_path, ROOM_TTL).await
        });
        tokio::time::sleep(Duration::from_millis(100)).await;
        assert!(
            !initializing.is_finished(),
            "the incoming revision must wait while the outgoing revision holds the database"
        );
        sqlx::query("COMMIT").execute(&blocker).await.unwrap();

        let started = tokio::time::timeout(Duration::from_secs(3), &mut initializing)
            .await
            .expect("startup should continue after the rollout lock is released")
            .unwrap();
        assert!(started.is_ok());
        let mode: String = sqlx::query_scalar("PRAGMA journal_mode")
            .fetch_one(&blocker)
            .await
            .unwrap();
        assert_eq!(mode, "delete", "Azure Files must never use a WAL sidecar");
    }

    #[tokio::test]
    async fn rate_limit_uses_forwarded_client_ip() {
        let (application, _storage) = isolated_app(ROOM_TTL).await;
        let mut last = StatusCode::OK;
        for _ in 0..41 {
            last = application
                .clone()
                .oneshot(
                    Request::post("/api/rooms")
                        .header("x-forwarded-for", "203.0.113.8")
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap()
                .status();
        }
        assert_eq!(last, StatusCode::TOO_MANY_REQUESTS);
    }

    #[tokio::test]
    async fn rate_limit_groups_forwarded_ip_addresses_despite_changing_ports() {
        let (application, _storage) = isolated_app(ROOM_TTL).await;
        let mut last = StatusCode::OK;
        for port in 40_000..40_041 {
            last = application
                .clone()
                .oneshot(
                    Request::post("/api/rooms")
                        .header("x-forwarded-for", format!("203.0.113.9:{port}"))
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap()
                .status();
        }
        assert_eq!(last, StatusCode::TOO_MANY_REQUESTS);
    }

    #[tokio::test]
    async fn rate_limit_gives_each_forwarded_client_its_own_40_request_allowance() {
        let (application, _storage) = isolated_app(ROOM_TTL).await;
        let responses = futures_util::future::join_all((1..=100).map(|octet| {
            application.clone().oneshot(
                Request::post("/api/rooms")
                    .header("x-forwarded-for", format!("203.0.113.{octet}"))
                    .body(Body::empty())
                    .unwrap(),
            )
        }))
        .await;
        for response in responses {
            let response = response.unwrap();
            assert_eq!(
                response.status(),
                StatusCode::OK,
                "a separate forwarded client must not consume another client's allowance"
            );
        }
    }

    #[tokio::test]
    async fn rate_limit_returns_retry_after_after_exactly_40_requests_per_client() {
        let (application, _storage) = isolated_app(ROOM_TTL).await;
        let mut statuses = Vec::new();
        let mut retry_after = Vec::new();
        for _ in 0..45 {
            let response = application
                .clone()
                .oneshot(
                    Request::post("/api/rooms")
                        .header("x-forwarded-for", "198.51.100.45")
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            statuses.push(response.status());
            retry_after.push(response.headers().get(header::RETRY_AFTER).cloned());
        }
        assert_eq!(
            statuses
                .iter()
                .filter(|&&status| status == StatusCode::OK)
                .count(),
            40
        );
        assert_eq!(
            statuses
                .iter()
                .filter(|&&status| status == StatusCode::TOO_MANY_REQUESTS)
                .count(),
            5
        );
        assert!(retry_after
            .iter()
            .zip(statuses)
            .filter(|(_, status)| *status == StatusCode::TOO_MANY_REQUESTS)
            .all(|(value, _)| value == &Some(HeaderValue::from_static("1"))));
    }

    #[tokio::test]
    async fn every_room_endpoint_uses_the_shared_rate_limiter() {
        let (application, _storage) = isolated_app(ROOM_TTL).await;
        let join_responses = futures_util::future::join_all((0..41).map(|_| {
            application.clone().oneshot(
                Request::post("/api/rooms/ABCDEF/join")
                    .header("x-forwarded-for", "198.51.100.61")
                    .body(Body::empty())
                    .unwrap(),
            )
        }))
        .await;
        assert_eq!(
            join_responses
                .iter()
                .filter(|response| response.as_ref().unwrap().status() == StatusCode::NOT_FOUND)
                .count(),
            40
        );
        assert_eq!(
            join_responses
                .iter()
                .filter(|response| {
                    response.as_ref().unwrap().status() == StatusCode::TOO_MANY_REQUESTS
                })
                .count(),
            1
        );

        let socket_responses = futures_util::future::join_all((0..41).map(|_| {
            application.clone().oneshot(
                Request::get("/api/rooms/ABCDEF/socket?role=host&token=BAD")
                    .header("x-forwarded-for", "198.51.100.62")
                    .body(Body::empty())
                    .unwrap(),
            )
        }))
        .await;
        assert_eq!(
            socket_responses
                .iter()
                .filter(|response| response.as_ref().unwrap().status() == StatusCode::BAD_REQUEST)
                .count(),
            40
        );
        assert_eq!(
            socket_responses
                .iter()
                .filter(|response| {
                    response.as_ref().unwrap().status() == StatusCode::TOO_MANY_REQUESTS
                })
                .count(),
            1
        );
    }

    #[tokio::test]
    async fn regression_p0_concurrent_45_request_burst_has_exactly_40_accepts_and_5_retryable_limits(
    ) {
        // Verification 21 sends its 45 requests at once. Exercise that same
        // shape in one process so the SQLite upsert cannot admit an extra
        // request when many handlers arrive together. Cross-pool behavior is
        // covered separately below.
        let (application, _storage) = isolated_app(ROOM_TTL).await;
        let responses = futures_util::future::join_all((0..45).map(|_| {
            application.clone().oneshot(
                Request::post("/api/rooms")
                    .header("x-forwarded-for", "198.51.100.106")
                    .body(Body::empty())
                    .unwrap(),
            )
        }))
        .await;

        let responses: Vec<Response> = responses.into_iter().map(Result::unwrap).collect();
        assert_eq!(
            responses
                .iter()
                .filter(|response| response.status() == StatusCode::OK)
                .count(),
            40,
            "the exact verifier burst must admit the documented 40 requests"
        );
        let limited: Vec<&Response> = responses
            .iter()
            .filter(|response| response.status() == StatusCode::TOO_MANY_REQUESTS)
            .collect();
        assert_eq!(
            limited.len(),
            5,
            "the remaining five simultaneous requests must be limited"
        );
        assert!(limited.iter().all(|response| {
            response.headers().get(header::RETRY_AFTER) == Some(&HeaderValue::from_static("1"))
        }));
    }

    #[tokio::test]
    async fn regression_p0_three_process_limiters_share_exact_40_request_allowance() {
        // Verification 22 observed 80 accepts because three processes owned
        // separate counters. Three independent pools now use one SQLite row,
        // so the first 40 requests consume the shared allowance exactly once.
        let storage = tempfile::tempdir().unwrap();
        let database_path = storage.path().join("relay.sqlite3");
        let first_process = app_at(&database_path, ROOM_TTL).await;
        let second_process = app_at(&database_path, ROOM_TTL).await;
        let third_process = app_at(&database_path, ROOM_TTL).await;
        let responses = futures_util::future::join_all((0..45).map(|request_number| {
            let application = match request_number % 3 {
                0 => first_process.clone(),
                1 => second_process.clone(),
                _ => third_process.clone(),
            };
            application.oneshot(
                Request::post("/api/rooms")
                    .header("x-forwarded-for", "198.51.100.80")
                    .body(Body::empty())
                    .unwrap(),
            )
        }))
        .await;
        let statuses: Vec<StatusCode> = responses
            .into_iter()
            .map(|response| response.unwrap().status())
            .collect();

        assert_eq!(
            statuses
                .iter()
                .filter(|&&status| status == StatusCode::OK)
                .count(),
            40,
            "all pools must share one exact allowance"
        );
        assert_eq!(
            statuses
                .iter()
                .filter(|&&status| status == StatusCode::TOO_MANY_REQUESTS)
                .count(),
            5
        );
    }

    #[tokio::test]
    // @claim:ephemeral-rooms
    async fn claim_ephemeral_rooms_persist_across_restart_until_the_configured_ttl() {
        assert_eq!(ROOM_TTL, Duration::from_secs(7_200));
        let storage = tempfile::tempdir().unwrap();
        let database_path = storage.path().join("relay.sqlite3");
        let application = app_at(&database_path, Duration::from_millis(200)).await;
        let create = application
            .clone()
            .oneshot(Request::post("/api/rooms").body(Body::empty()).unwrap())
            .await
            .unwrap();
        let created: serde_json::Value = serde_json::from_slice(
            &axum::body::to_bytes(create.into_body(), 4096)
                .await
                .unwrap(),
        )
        .unwrap();
        let code = created["code"].as_str().unwrap();

        let first_join = application
            .clone()
            .oneshot(
                Request::post(format!("/api/rooms/{code}/join"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(first_join.status(), StatusCode::OK);

        drop(application);
        let restarted = app_at(&database_path, Duration::from_millis(200)).await;
        let persisted_join = restarted
            .clone()
            .oneshot(
                Request::post(format!("/api/rooms/{code}/join"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(persisted_join.status(), StatusCode::OK);

        tokio::time::sleep(Duration::from_millis(230)).await;
        let expired_join = restarted
            .oneshot(
                Request::post(format!("/api/rooms/{code}/join"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(expired_join.status(), StatusCode::NOT_FOUND);
        assert_expiring_room_closes_an_open_websocket().await;
    }

    async fn assert_expiring_room_closes_an_open_websocket() {
        let (application, _storage) = isolated_app(Duration::from_millis(80)).await;
        let create = application
            .clone()
            .oneshot(Request::post("/api/rooms").body(Body::empty()).unwrap())
            .await
            .unwrap();
        let created: serde_json::Value = serde_json::from_slice(
            &axum::body::to_bytes(create.into_body(), 4096)
                .await
                .unwrap(),
        )
        .unwrap();
        let code = created["code"].as_str().unwrap();
        let token = created["host_token"].as_str().unwrap();

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move {
            axum::serve(listener, application).await.unwrap();
        });
        let (mut socket, _) = tokio_tungstenite::connect_async(format!(
            "ws://{address}/api/rooms/{code}/socket?role=host&token={token}"
        ))
        .await
        .unwrap();

        let closed = tokio::time::timeout(Duration::from_millis(400), async {
            while let Some(message) = socket.next().await {
                match message.unwrap() {
                    tokio_tungstenite::tungstenite::Message::Close(_) => return true,
                    _ => continue,
                }
            }
            true
        })
        .await
        .unwrap_or(false);
        server.abort();
        assert!(closed, "the room socket should close when the room expires");
    }

    #[tokio::test]
    async fn unknown_frontend_routes_return_http_not_found() {
        let (application, _storage) = isolated_app(ROOM_TTL).await;
        let response = application
            .oneshot(
                Request::get("/not-a-real-page")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[test]
    fn validates_messages_by_room_role() {
        assert!(allowed_room_message(
            "companion",
            &json!({ "type": "tap", "at": 1000, "round": 1, "tap_id": 1 })
        ));
        assert!(allowed_room_message(
            "companion",
            &json!({ "type": "score_ack", "score": 78, "round": 1, "tap_count": 1 })
        ));
        assert!(allowed_room_message(
            "host",
            &json!({ "type": "score", "score": 78, "round": 1, "tap_count": 1 })
        ));
        assert!(!allowed_room_message(
            "companion",
            &json!({ "type": "tap", "at": 1000 })
        ));
        assert!(!allowed_room_message(
            "companion",
            &json!({ "type": "round_start", "bpm": 104, "duration": 60 })
        ));
        assert!(!allowed_room_message(
            "host",
            &json!({ "type": "round_start", "bpm": 900, "duration": 60 })
        ));
    }
}
