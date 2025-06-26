import { verifyToken } from "../Modules/auth/tokens.service.js";
import { UserModel } from "../DB/models/user.model.js";

export const authentication = async (req, res, next) => {
  
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token missing!" });

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    const user = await UserModel.findById(decoded.id).select("isLoggedIn");

    if (!user || !user.isLoggedIn) {
      return res.status(401).json({ message: "You are not logged in!" });
    }

    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token!" });
  }
};

export const allowedRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied, You are not authorized!" });
    }
    next();
  };
};