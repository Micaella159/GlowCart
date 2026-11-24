const { Pool } = require("pg");
const { parse } = require("pg-connection-string");
require("dotenv").config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to start the API.");
}

let parsedConnection;
let protocol;
let channelBinding;

try {
  const parsedUrl = new URL(databaseUrl);
  protocol = parsedUrl.protocol;
  channelBinding = parsedUrl.searchParams.get("channel_binding");
  const sslMode = parsedUrl.searchParams.get("sslmode");

  if (sslMode && !["require", "verify-full"].includes(sslMode)) {
    throw new Error("Unsupported SSL mode.");
  }

  parsedUrl.searchParams.delete("sslmode");
  parsedUrl.searchParams.delete("channel_binding");
  parsedConnection = parse(parsedUrl.toString());
} catch {
  throw new Error("DATABASE_URL must be a valid PostgreSQL connection string.");
}

if (!["postgres:", "postgresql:"].includes(protocol)
  || !parsedConnection.host || !parsedConnection.database
  || !parsedConnection.user || !parsedConnection.password) {
  throw new Error("DATABASE_URL must be a valid PostgreSQL connection string.");
}

const pool = new Pool({
  ...parsedConnection,
  ssl: { rejectUnauthorized: true },
  enableChannelBinding: channelBinding === "require",
  connectionTimeoutMillis: 10000,
});

pool.on("error", (error) => {
  console.error("Unexpected database pool error:", error.code || "unknown");
});

module.exports = pool;