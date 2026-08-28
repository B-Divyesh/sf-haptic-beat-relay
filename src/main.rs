use std::{env, net::SocketAddr};

use haptic_beat_relay::{app, BUILD_SHA};
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
    let port = supplied_port.unwrap_or(8080);
    let address = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = TcpListener::bind(address)
        .await
        .expect("the configured port should be available");
    info!(
        port,
        build_sha = BUILD_SHA,
        config = if supplied_port.is_some() {
            "PORT supplied; no secrets required"
        } else {
            "PORT defaulted; no secrets required"
        },
        "relay started"
    );

    axum::serve(listener, app("frontend/dist"))
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
