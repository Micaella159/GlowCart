const { createHttpError } = require("../utils/httpError");
const { getSessionTokenSecret, hashSessionToken } = require("../utils/sessionToken");

function createAuthenticate({ pool, env = process.env }) {
  return async (req, res, next) => {
    const secret = getSessionTokenSecret(env);
    const authorization = req.get("authorization") || "";
    const match = /^Bearer ([A-Za-z0-9_-]+)$/.exec(authorization);

    if (!match || match[1].length < 40) {
      throw createHttpError(401, "AUTHENTICATION_REQUIRED", "Sign in to continue.");
    }

    const tokenHash = hashSessionToken(match[1], secret);
    let result;
    try {
      result = await pool.query(
        `SELECT u.id, u.email, u.name, s.expires_at
         FROM public.auth_sessions AS s
         JOIN public.users AS u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
        [tokenHash],
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
    req.authTokenHash = tokenHash;
    next();
  };
}

module.exports = createAuthenticate;
