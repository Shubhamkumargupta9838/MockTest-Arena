const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {

  const token = req.cookies.mocktest_jwt;

  if (!token) {
    return res.status(401).json({
      message: "Not authenticated"
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
      message: "Invalid or expired token"
    });
  }
};

module.exports = auth;