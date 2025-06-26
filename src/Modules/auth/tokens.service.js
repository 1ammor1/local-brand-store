import jwt from "jsonwebtoken";

export const generateToken = (payload, expiresIn = "15m") => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

export const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);
