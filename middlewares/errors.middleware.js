export const notFound = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandling = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";
  let errors;

  // MongoDB / Mongoose - invalid ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = "מזהה לא תקין";
  }

  // Mongoose validation
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "הנתונים שנשלחו אינם תקינים";
    errors = Object.values(err.errors).map((error) => error.message);
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `הערך בשדה ${field} כבר קיים במערכת` : "הערך כבר קיים במערכת";
  }

  // JWT
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Token לא תקין";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token פג תוקף";
  }

  const response = {
    success: false,
    message: statusCode === 500 && process.env.NODE_ENV === "production"
      ? "אירעה שגיאה פנימית בשרת"
      : message,
  };

  if (errors) {
    response.errors = errors;
  }

  if (process.env.NODE_ENV === "development" && err.stack) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};