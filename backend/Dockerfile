FROM rust:latest AS builder

WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock* ./
# Create dummy mains to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs && mkdir -p src/bin && echo "fn main() {}" > src/bin/seed.rs
RUN cargo build --release --bin fitness_tracker_api --bin seed
RUN rm -rf src

COPY . .
ENV SQLX_OFFLINE=true
RUN touch src/main.rs src/bin/seed.rs && cargo build --release --bin fitness_tracker_api --bin seed

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/fitness_tracker_api /usr/local/bin/
COPY --from=builder /app/target/release/seed /usr/local/bin/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV SERVER__HOST=0.0.0.0
ENV SERVER__PORT=10000

EXPOSE 10000
CMD ["/entrypoint.sh"]
