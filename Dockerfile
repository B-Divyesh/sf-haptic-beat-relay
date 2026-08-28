FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY frontend ./frontend
RUN npm run build

FROM rust:1.85-bookworm AS backend-builder
ARG BUILD_SHA=dev
ENV BUILD_SHA=${BUILD_SHA}
WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release --locked

FROM debian:bookworm-slim AS runtime
RUN useradd --system --uid 10001 --create-home relay
WORKDIR /app
COPY --from=backend-builder /build/target/release/haptic-beat-relay /app/haptic-beat-relay
COPY --from=frontend-builder /build/frontend/dist /app/frontend/dist
USER 10001
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/app/haptic-beat-relay"]

