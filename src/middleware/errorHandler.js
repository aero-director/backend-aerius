// src/middleware/errorHandler.js
export default function errorHandler(err, req, res, next) {
  console.error(err.stack);
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  // Do not leak stack traces in production
  const response = {
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  };
  res.status(status).json(response);
}
