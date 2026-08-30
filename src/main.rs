use std::{env, net::SocketAddr};

use haptic_beat_relay::{app, database_path, BUILD_SHA};
use tokio::net::TcpListener;
use tracing::info;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "haptic_beat_relay=info,tower_http=info".into()),
        )
        .init();

    let supplied_port = env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok());
    let supplied_database_path = env::var_os("RELAY_DATABASE_PATH").is_some();
    let port = supplied_port.unwrap_or(8080);
    let address = SocketAddr::from(([0, 0, 0, 0], port));
    let database_path = database_path();
    let application = app("frontend/dist")
        .await
        .expect("the SQLite relay store should initialize");
    let listener = TcpListener::bind(address)
        .await
        .expect("the configured port should be available");
    info!(
        port,
        build_sha = BUILD_SHA,
        database_path = %database_path.display(),
        config = match (supplied_port.is_some(), supplied_database_path) {
            (true, true) => "PORT and SQLite path supplied; no secrets required",
            (true, false) => "PORT supplied; SQLite path defaulted; no secrets required",
            (false, true) => "PORT defaulted; SQLite path supplied; no secrets required",
            (false, false) => "PORT and SQLite path defaulted; no secrets required",
        },
        "relay started"
    );

    axum::serve(listener, application)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("server should run");
}

async fn shutdown_signal() {
    let control_c = async {
        tokio::signal::ctrl_c().await.ok();
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("signal handler should install")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = control_c => {},
        _ = terminate => {},
    }
}
