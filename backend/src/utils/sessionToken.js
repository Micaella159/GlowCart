const crypto = require("crypto");
const { createHttpError } = require("./httpError");

function getSessionTokenSecret(env) {
  const secret = typeof env.AUTH_TOKEN_SECRET === "string" ? env.AUTH_TOKEN_SECRET : "";
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw createHttpError(
      503,
      "AUTH_NOT_CONFIGURED",
      "Authentication is not configured. Set AUTH_TOKEN_SECRET on the backend.",
    );
  }
  return secret;
}

function hashSessionToken(token, secret) {
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

module.exports = { getSessionTokenSecret, hashSessionToken };
