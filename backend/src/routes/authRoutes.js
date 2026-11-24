const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");
const { createHttpError } = require("../utils/httpError");
const { stripControlCharacters } = require("../utils/sanitizeText");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,}$/;
const BCRYPT_ROUNDS = 12;

function createAuthRouter({ pool, env = process.env }) {
  const router = express.Router();
  const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler(req, res) {
      res.status(429).json({
        success: false,
        error: {
          code: "AUTH_RATE_LIMITED",
          message: "Too many sign-in attempts. Try again later.",
          details: null,
        },
        requestId: req.requestId,
      });
    },
  });

  function getAuthSettings() {
    const tokenSecret = typeof env.AUTH_TOKEN_SECRET === "string"
      ? env.AUTH_TOKEN_SECRET
      : "";
    const sessionTtlHours = Number(env.AUTH_SESSION_TTL_HOURS || 168);

    if (Buffer.byteLength(tokenSecret, "utf8") < 32) {
      throw createHttpError(
        503,
        "AUTH_NOT_CONFIGURED",
        "Authentication is not configured. Set AUTH_TOKEN_SECRET on the backend.",
      );
    }
    if (!Number.isInteger(sessionTtlHours) || sessionTtlHours < 1 || sessionTtlHours > 720) {
      throw createHttpError(
        503,
        "AUTH_NOT_CONFIGURED",
        "AUTH_SESSION_TTL_HOURS must be an integer between 1 and 720.",
      );
    }

    return { tokenSecret, sessionTtlHours };
  }

  function hashToken(token, secret) {
    return crypto.createHmac("sha256", secret).update(token).digest("hex");
  }

  function validateRegistration(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw createHttpError(400, "INVALID_INPUT", "A JSON object is required.");
    }

    const name = typeof body.name === "string"
      ? stripControlCharacters(body.name).replace(/\s+/g, " ").trim()
      : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || name.length > 80) {
      throw createHttpError(400, "INVALID_NAME", "Name is required and must be 80 characters or fewer.");
    }
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      throw createHttpError(400, "INVALID_EMAIL", "Enter a valid email address.");
    }
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      throw createHttpError(
        400,
        "INVALID_PASSWORD",
        "Password must be at least 8 characters and no more than 72 UTF-8 bytes.",
      );
    }

    return { name, email, password };
  }

  function validateLogin(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw createHttpError(400, "INVALID_INPUT", "A JSON object is required.");
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (email.length > 254 || !EMAIL_PATTERN.test(email) || !password
      || Buffer.byteLength(password, "utf8") > 72) {
      throw createHttpError(400, "INVALID_CREDENTIALS", "Enter a valid email and password.");
    }

    return { email, password };
  }

  async function createSession(connection, userId, settings) {
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + settings.sessionTtlHours * 60 * 60 * 1000);
    await connection.query(
      `INSERT INTO public.auth_sessions (token_hash, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [hashToken(token, settings.tokenSecret), userId, expiresAt],
    );
    return { token, expiresAt };
  }

  function requireAuthentication() {
    return async (req, res, next) => {
      const settings = getAuthSettings();
      const authorization = req.get("authorization") || "";
      const match = /^Bearer ([A-Za-z0-9_-]+)$/.exec(authorization);

      if (!match || !TOKEN_PATTERN.test(match[1])) {
        throw createHttpError(401, "AUTHENTICATION_REQUIRED", "Sign in to continue.");
      }

      let result;
      try {
        result = await pool.query(
          `SELECT u.id, u.email, u.name, s.expires_at
           FROM public.auth_sessions AS s
           JOIN public.users AS u ON u.id = s.user_id
           WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
          [hashToken(match[1], settings.tokenSecret)],
        );
      } catch (error) {
        throw createHttpError(
          503,
          "AUTH_UNAVAILABLE",
          "Authentication is temporarily unavailable.",
          error,
        );
      }

      if (result.rowCount !== 1) {
        throw createHttpError(401, "INVALID_SESSION", "Your session is invalid or expired. Sign in again.");
      }

      req.user = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name,
      };
      req.authTokenHash = hashToken(match[1], settings.tokenSecret);
      next();
    };
  }

  router.post("/register", authRateLimit, async (req, res) => {
    const settings = getAuthSettings();
    const input = validateRegistration(req.body);
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    let client;
    try {
      client = await pool.connect();
    } catch (error) {
      throw createHttpError(
        503,
        "AUTH_UNAVAILABLE",
        "Registration is temporarily unavailable.",
        error,
      );
    }

    try {
      await client.query("BEGIN");
      const insertedUser = await client.query(
        `INSERT INTO public.users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, name`,
        [input.name, input.email, passwordHash],
      );
      const user = insertedUser.rows[0];
      const session = await createSession(client, user.id, settings);
      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        data: { user, token: session.token, expiresAt: session.expiresAt.toISOString() },
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Registration rollback failed.", rollbackError.code || "unknown");
      }

      if (error.code === "23505") {
        throw createHttpError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
      }
      throw createHttpError(
        503,
        "AUTH_UNAVAILABLE",
        "Registration is temporarily unavailable.",
        error,
      );
    } finally {
      client.release();
    }
  });

  router.post("/login", authRateLimit, async (req, res) => {
    const settings = getAuthSettings();
    const input = validateLogin(req.body);
    let result;
    try {
      result = await pool.query(
        `SELECT id, email, name, password_hash
         FROM public.users
         WHERE lower(email) = $1`,
        [input.email],
      );
    } catch (error) {
      throw createHttpError(
        503,
        "AUTH_UNAVAILABLE",
        "Authentication is temporarily unavailable.",
        error,
      );
    }

    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
      throw createHttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }

    let session;
    try {
      session = await createSession(pool, user.id, settings);
    } catch (error) {
      throw createHttpError(
        503,
        "AUTH_UNAVAILABLE",
        "Authentication is temporarily unavailable.",
        error,
      );
    }

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
      },
      meta: { requestId: req.requestId },
    });
  });

  router.get("/me", requireAuthentication(), (req, res) => {
    res.json({
      success: true,
      data: { user: req.user },
      meta: { requestId: req.requestId },
    });
  });

  router.post("/logout", requireAuthentication(), async (req, res) => {
    try {
      await pool.query("DELETE FROM public.auth_sessions WHERE token_hash = $1", [req.authTokenHash]);
    } catch (error) {
      throw createHttpError(
        503,
        "AUTH_UNAVAILABLE",
        "Sign out could not be completed. Try again.",
        error,
      );
    }

    res.json({
      success: true,
      data: { loggedOut: true },
      meta: { requestId: req.requestId },
    });
  });

  return router;
}

module.exports = createAuthRouter;
