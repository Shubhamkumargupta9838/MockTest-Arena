/**
 * middleware/logger.js — Simple request logger
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    console.log(
      `${color}${req.method}\x1b[0m ${req.path} → ${res.statusCode} (${ms}ms)`
    );
  });
  next();
}

/**
 * middleware/errorHandler.js — Centralised error response
 */
function errorHandler(err, req, res, next) {
  console.error('❌', err.stack || err.message);
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}

module.exports = { requestLogger, errorHandler };
