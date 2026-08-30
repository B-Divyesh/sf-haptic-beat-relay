use std::{
    collections::HashMap,
    net::{IpAddr, SocketAddr},
    sync::Arc,
    time::{Duration, Instant},
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
const RATE_BURST: u32 = 40;

#[derive(Clone)]
pub struct AppState {
    rooms: Arc<Mutex<HashMap<String, Room>>>,
    rates: Arc<Mutex<HashMap<String, RateEntry>>>,
    room_ttl: Duration,
}

struct Room {
    host_token: String,
    companion_token: Option<String>,
    expires_at: Instant,
    channel: broadcast::Sender<String>,
}

struct RateEntry {
    window_started: Instant,
    count: u32,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            rooms: Arc::new(Mutex::new(HashMap::new())),
            rates: Arc::new(Mutex::new(HashMap::new())),
            room_ttl: ROOM_TTL,
        }
    }
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

pub fn app(dist_dir: impl Into<String>) -> Router {
    app_with_room_ttl(dist_dir, ROOM_TTL)
}

fn app_with_room_ttl(dist_dir: impl Into<String>, room_ttl: Duration) -> Router {
    let state = AppState {
        room_ttl,
        ..AppState::default()
    };
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

async fn create_room(State(state): State<AppState>) -> Json<RoomCreated> {
    let mut rooms = state.rooms.lock().await;
    rooms.retain(|_, room| !room_is_expired(room));

    let code = loop {
        let candidate = random_code(6);
        if !rooms.contains_key(&candidate) {
            break candidate;
        }
    };
    let host_token = random_code(32);
    let (channel, _) = broadcast::channel(128);
    let expires_at = Instant::now() + state.room_ttl;
    rooms.insert(
        code.clone(),
        Room {
            host_token: host_token.clone(),
            companion_token: None,
            expires_at,
            channel,
        },
    );

    let created = RoomCreated {
        code,
        host_token,
        expires_in_seconds: state.room_ttl.as_secs(),
    };
    drop(rooms);
    schedule_room_expiry(state, created.code.clone(), expires_at);
    Json(created)
}

async fn join_room(
    State(state): State<AppState>,
    Path(raw_code): Path<String>,
) -> Result<Json<RoomJoined>, ApiError> {
    let code = normalized_code(&raw_code)?;
    let mut rooms = state.rooms.lock().await;
    let room = rooms.get_mut(&code).ok_or_else(|| {
        ApiError::new(
            StatusCode::NOT_FOUND,
            "room_not_found",
            "That room is not open. Check the code with the host.",
        )
    })?;
    if room_is_expired(room) {
        rooms.remove(&code);
        return Err(ApiError::new(
            StatusCode::GONE,
            "room_expired",
            "That room expired. Ask the host to make a new room.",
        ));
    }
    if room.companion_token.is_some() {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "room_full",
            "That room already has a companion. Ask the host for a new room.",
        ));
    }
    let token = random_code(32);
    room.companion_token = Some(token.clone());
    Ok(Json(RoomJoined {
        companion_token: token,
    }))
}

async fn room_socket(
    State(state): State<AppState>,
    Path(raw_code): Path<String>,
    Query(query): Query<SocketQuery>,
    ws: WebSocketUpgrade,
) -> Result<Response, ApiError> {
    let code = normalized_code(&raw_code)?;
    let mut rooms = state.rooms.lock().await;
    let room = rooms.get(&code).ok_or_else(|| {
        ApiError::new(
            StatusCode::NOT_FOUND,
            "room_not_found",
            "That room is not open. Check the code with the host.",
        )
    })?;
    if room_is_expired(room) {
        rooms.remove(&code);
        return Err(ApiError::new(
            StatusCode::GONE,
            "room_expired",
            "That room expired. Ask the host to make a new room.",
        ));
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
    let channel = room.channel.clone();
    let expires_at = room.expires_at;
    let role = query.role;
    let token = query.token;
    drop(rooms);

    Ok(ws
        .on_upgrade(move |socket| {
            socket_session(socket, channel, role, token, code, expires_at, state)
        })
        .into_response())
}

async fn socket_session(
    socket: WebSocket,
    channel: broadcast::Sender<String>,
    role: String,
    token: String,
    code: String,
    expires_at: Instant,
    state: AppState,
) {
    let (mut socket_tx, mut socket_rx) = socket.split();
    let mut room_rx = channel.subscribe();
    let expiry = tokio::time::sleep_until(tokio::time::Instant::from_std(expires_at));
    tokio::pin!(expiry);
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
    if role == "companion" {
        let mut rooms = state.rooms.lock().await;
        if let Some(room) = rooms.get_mut(&code) {
            if room
                .companion_token
                .as_ref()
                .is_some_and(|current| constant_time_eq(current, &token))
            {
                room.companion_token = None;
            }
        }
    }
    let left = json!({ "type": "presence", "role": role, "connected": false }).to_string();
    let _ = channel.send(left);
}

fn room_is_expired(room: &Room) -> bool {
    Instant::now() >= room.expires_at
}

fn schedule_room_expiry(state: AppState, code: String, expires_at: Instant) {
    tokio::spawn(async move {
        tokio::time::sleep_until(tokio::time::Instant::from_std(expires_at)).await;
        let channel = {
            let mut rooms = state.rooms.lock().await;
            let should_remove = rooms
                .get(&code)
                .is_some_and(|room| room.expires_at == expires_at);
            should_remove
                .then(|| rooms.remove(&code).map(|room| room.channel))
                .flatten()
        };
        if let Some(channel) = channel {
            let _ = channel.send(json!({ "type": "room_expired" }).to_string());
        }
    });
}

fn allowed_room_message(role: &str, value: &serde_json::Value) -> bool {
    let Some(kind) = value.get("type").and_then(|item| item.as_str()) else {
        return false;
    };
    match (role, kind) {
        ("companion", "tap") => value.get("at").and_then(|item| item.as_i64()).is_some(),
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
        ("host", "score") | ("host", "round_end") => value
            .get("score")
            .and_then(|item| item.as_u64())
            .is_some_and(|score| score <= 100),
        _ => false,
    }
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

    let mut rates = state.rates.lock().await;
    // Entries only matter for one burst window. Pruning here keeps forwarded
    // client identities from accumulating in this intentionally ephemeral
    // service without introducing a cross-client quota.
    rates.retain(|_, entry| entry.window_started.elapsed() < RATE_WINDOW);
    let entry = rates.entry(client).or_insert(RateEntry {
        window_started: Instant::now(),
        count: 0,
    });
    let client_limited = consume_rate_slot(entry);
    if client_limited {
        drop(rates);
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
    drop(rates);
    next.run(request).await
}

fn consume_rate_slot(entry: &mut RateEntry) -> bool {
    if entry.window_started.elapsed() >= RATE_WINDOW {
        entry.window_started = Instant::now();
        entry.count = 0;
    }
    entry.count += 1;
    entry.count > RATE_BURST
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
    use tower::ServiceExt;

    #[tokio::test]
    async fn creates_and_joins_a_room() {
        let application = app("frontend/dist");
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
    async fn regression_p0_separate_process_room_state_reproduces_create_then_join_404() {
        // This is the exact production failure reported in verification 17:
        // an HTTP create reaches one process and the immediate companion join
        // reaches another process with a different in-memory room map. The
        // singleton deployment contract is the only supported topology while
        // the product deliberately keeps its room state ephemeral.
        let creator_process = app("frontend/dist");
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

        let secondary_join = app("frontend/dist")
            .oneshot(
                Request::post(format!("/api/rooms/{code}/join"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(
            secondary_join.status(),
            StatusCode::NOT_FOUND,
            "a companion routed to another process sees the verification-17 room_not_found failure"
        );

        let creator_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let creator_address = creator_listener.local_addr().unwrap();
        let creator_server = tokio::spawn(async move {
            axum::serve(creator_listener, creator_process)
                .await
                .unwrap();
        });
        let other_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let other_address = other_listener.local_addr().unwrap();
        let other_server = tokio::spawn(async move {
            axum::serve(other_listener, app("frontend/dist"))
                .await
                .unwrap();
        });

        let secondary_result = tokio_tungstenite::connect_async(format!(
            "ws://{other_address}/api/rooms/{code}/socket?role=host&token={token}"
        ))
        .await;
        match secondary_result {
            Err(tokio_tungstenite::tungstenite::Error::Http(response)) => {
                assert_eq!(response.status(), StatusCode::NOT_FOUND);
            }
            other => panic!("the separate process must reject the upgrade with 404, got {other:?}"),
        }

        let creator_result = tokio_tungstenite::connect_async(format!(
            "ws://{creator_address}/api/rooms/{code}/socket?role=host&token={token}"
        ))
        .await;
        assert!(
            creator_result.is_ok(),
            "the room-owning process must accept the upgrade"
        );
        creator_server.abort();
        other_server.abort();
    }

    #[tokio::test]
    async fn rate_limit_uses_forwarded_client_ip() {
        let application = app("frontend/dist");
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
        let application = app("frontend/dist");
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
        let application = app("frontend/dist");
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
        let application = app("frontend/dist");
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
    async fn regression_p0_concurrent_45_request_burst_has_exactly_40_accepts_and_5_retryable_limits()
    {
        // Verification 21 sends its 45 requests at once. Exercise that same
        // shape in one process so the mutex-backed bucket cannot accidentally
        // admit an extra request when many handlers arrive together. A live
        // multi-process deployment is separately rejected by the singleton
        // topology claim below and by the deploy contract.
        let application = app("frontend/dist");
        let responses = futures_util::future::join_all((0..45).map(|_| {
            application.clone().oneshot(
                Request::post("/api/rooms")
                    .header("x-forwarded-for", "198.51.100.106")
                    .body(Body::empty())
                    .unwrap(),
            )
        }))
        .await;

        let responses: Vec<Response> = responses
            .into_iter()
            .map(Result::unwrap)
            .collect();
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
            response.headers().get(header::RETRY_AFTER)
                == Some(&HeaderValue::from_static("1"))
        }));
    }

    #[tokio::test]
    async fn regression_p0_three_process_limiters_admit_all_45_requests() {
        // This is the exact verification-17 allowance failure. Three
        // process-local replicas each own a fresh counter, so a 45-request
        // burst from one forwarded client is incorrectly admitted in full.
        // The guarded Container App deployment must retain one ready replica
        // until these ephemeral buckets move to shared infrastructure.
        let first_process = app("frontend/dist");
        let second_process = app("frontend/dist");
        let third_process = app("frontend/dist");
        let mut statuses = Vec::new();

        for request_number in 0..45 {
            let application = match request_number % 3 {
                0 => first_process.clone(),
                1 => second_process.clone(),
                _ => third_process.clone(),
            };
            let response = application
                .oneshot(
                    Request::post("/api/rooms")
                        .header("x-forwarded-for", "198.51.100.80")
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            statuses.push(response.status());
        }

        assert_eq!(
            statuses
                .iter()
                .filter(|&&status| status == StatusCode::OK)
                .count(),
            45,
            "three process-local limiters reproduce the unsafe 45/45 allowance"
        );
        assert_eq!(
            statuses
                .iter()
                .filter(|&&status| status == StatusCode::TOO_MANY_REQUESTS)
                .count(),
            0
        );
    }

    #[tokio::test]
    // @claim:ephemeral-rooms
    async fn claim_ephemeral_rooms_evict_after_the_configured_ttl_and_on_restart() {
        assert_eq!(ROOM_TTL, Duration::from_secs(7_200));
        let application = app_with_room_ttl("frontend/dist", Duration::from_millis(40));
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

        tokio::time::sleep(Duration::from_millis(70)).await;
        let expired_join = application
            .clone()
            .oneshot(
                Request::post(format!("/api/rooms/{code}/join"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(expired_join.status(), StatusCode::NOT_FOUND);

        let restarted = app("frontend/dist")
            .oneshot(
                Request::post(format!("/api/rooms/{code}/join"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(restarted.status(), StatusCode::NOT_FOUND);
        assert_expiring_room_closes_an_open_websocket().await;
    }

    async fn assert_expiring_room_closes_an_open_websocket() {
        let application = app_with_room_ttl("frontend/dist", Duration::from_millis(80));
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
        let response = app("frontend/dist")
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
