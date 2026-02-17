FROM rust:latest AS builder

WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock* ./
# Create dummy main to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs && mkdir -p src/bin && echo "fn main() {}" > src/bin/seed.rs
RUN cargo build --release --bin fitness_tracker_api
RUN rm -rf src

COPY . .
ENV SQLX_OFFLINE=true
RUN touch src/main.rs && cargo build --release --bin fitness_tracker_api

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/fitness_tracker_api /usr/local/bin/

ENV SERVER__HOST=0.0.0.0
ENV SERVER__PORT=10000

EXPOSE 10000
CMD ["fitness_tracker_api"]
