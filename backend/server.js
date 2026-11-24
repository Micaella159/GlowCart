const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const pool = require("./src/config/db");
const productRoutes = require("./src/routes/productRoutes");
const createAuthRouter = require("./src/routes/authRoutes");
const createAIRouter = require("./src/routes/aiRoutes");
const createOrderRouter = require("./src/routes/orderRoutes");
const { createHttpError, errorHandler } = require("./src/utils/httpError");

function createApp({ database = pool, env = process.env, fetchImpl } = {}) {
  const app = express();

  app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader("X-Request-ID", req.requestId);
    next();
  });

  const allowedOrigin = env.FRONTEND_URL || "http://localhost:5173";
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origin === allowedOrigin) return callback(null, true);
      return callback(createHttpError(403, "CORS_ORIGIN_DENIED", "This origin is not allowed."));
    },
  }));

  app.use(express.json({ limit: "100kb" }));

  app.get("/api/v1", (req, res) => {
    res.json({
      success: true,
      data: { message: "Welcome to GlowCart API!" },
      meta: { requestId: req.requestId },
    });
  });

  app.get("/api/v1/health", async (req, res) => {
    try {
      await database.query("SELECT NOW()");

      res.json({
        success: true,
        data: { status: "ok", database: "connected" },
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      throw createHttpError(
        503,
        "DATABASE_UNAVAILABLE",
        "The database is temporarily unavailable.",
        error,
      );
    }
  });

  app.use("/api/v1", productRoutes);
  app.use("/api/v1/auth", createAuthRouter({ pool: database, env }));
  app.use("/api/v1/ai", createAIRouter({ pool: database, env, fetchImpl }));
  app.use("/api/v1", createOrderRouter({ pool: database, env }));

  app.use("/api/v1", (req, res, next) => {
    next(createHttpError(404, "ENDPOINT_NOT_FOUND", "The requested API endpoint was not found."));
  });

  app.use(errorHandler);
  return app;
}

if (require.main === module) {
  const PORT = Number(process.env.PORT || 5000);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error("PORT must be a valid TCP port.");
  }

  createApp().listen(PORT, "0.0.0.0", () => {
    console.log(`GlowCart API listening on port ${PORT}`);
  });
}

module.exports = { createApp };