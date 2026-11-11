
const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  let token = req.cookies?.nexto_token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token"
    });
  }
}

function authorizeAdmin(req, res, next) {
  if (!req.user || (req.user.role || "").toLowerCase() !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin privileges required"
    });
  }
  next();
}

module.exports = {
  authenticateToken,
  authorizeAdmin
};