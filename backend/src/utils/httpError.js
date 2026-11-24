function createHttpError(status, code, message, cause) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.expose = true;
  if (cause) error.cause = cause;
  return error;
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
    ? error.status
    : 500;
  const requestId = req.requestId;
  const invalidJson = status === 400 && error.type === "entity.parse.failed";
  const code = invalidJson
    ? "INVALID_JSON"
    : status >= 500
      ? error.expose ? error.code : "INTERNAL_SERVER_ERROR"
      : error.code || "REQUEST_ERROR";
  const message = invalidJson
    ? "Request body must be valid JSON."
    : status >= 500
      ? error.expose ? error.message : "An unexpected server error occurred."
      : error.message;

  if (status >= 500) {
    console.error(`[${requestId}] API error:`, error.cause?.code || error.code || "unknown");
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details: null,
    },
    requestId,
  });
}

module.exports = { createHttpError, errorHandler };
