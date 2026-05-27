import TokenService from "../service/token.service.js";

export const authenticateToken = async (req, res, next) => {
  try {
    const { authorization } = req.headers;

    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        message: !authorization
          ? "Authorization header is required"
          : "Invalid authorization format. Use: Bearer <token>",
      });
    }

    const decoded = TokenService.verifyToken(token, "access");

    if (decoded.type !== "access") {
      return res.status(401).json({ message: "Invalid token type" });
    }

    req.user = {
      id: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    return res.status(500).json({
      message: "Authentication error",
      error: error.message,
    });
  }
};

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Requires one of: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
};

export const requireAdmin = requireRole(["admin"]);
export const requireTeacher = requireRole(["teacher", "admin"]);
export const requireStudent = requireRole(["student", "teacher", "admin"]);

// נשאיר alias בשם הישן כדי לא לשבור קוד קיים
export const requireUser = requireStudent;

export default {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireTeacher,
  requireStudent,
  requireUser,
};