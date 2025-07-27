import { UserModel } from "../../DB/models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateToken, verifyToken } from "./tokens.service.js";
import { sendEmail } from "../../utils/email.js";



export const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existing = await UserModel.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ firstName, lastName, email, password: hashedPassword });

    const token = generateToken({ id: user._id }, "15m");
    const verificationLink = `${process.env.LOCAL_HOST}auth/verify/${token}`;

    const html = `<p>Hello ${firstName}, please verify your email:</p><a href="${verificationLink}">Verify</a>`;
    await sendEmail(user.email, "Verify Email", html);

    return res.status(201).json({
      message: "User registered successfully. Please verify your email.",
      user: {
        id: user._id,
        firstName,
        lastName,
        email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const user = await UserModel.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Email is not registered" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Email or password is incorrect" });

    if (!user.confirmEmail) {
      const token = generateToken({ id: user._id }, "15m");
      const verificationLink = `${process.env.REAL_HOST}auth/verify/${token}`;
      const html = `<p>Hello ${user.firstName}, verify your email:</p><a href="${verificationLink}">Verify</a>`;
      await sendEmail(user.email, "Verify Email to Login", html);
      return res.status(401).json({
        message: "Please verify your email. A new link has been sent.",
      });
    }

    const Role = user.role;
    
    const now = new Date();
    if (user.isLoggedIn && user.accessToken && user.accessTokenExpiresAt > now)
      return res.status(200).json({
        message: "Already logged in",
        accessToken: user.accessToken,
        role: Role
      });

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    user.accessToken = accessToken;
    user.accessTokenExpiresAt = new Date(Date.now() + 3600000);
    user.isLoggedIn = true;
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({ message: "Login successful", accessToken , Role });
  } catch (err) {
    next(err);
  }
};

export const sendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  const user = await UserModel.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const token = generateToken({ email: user.email }, "15m");
  const link = `${process.env.REAL_HOST}auth/verify/${token}`;
  console.log("🔗 Email verification link:", link);

  return res.status(200).json({ message: "Verification email sent" });
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = verifyToken(token);
    const user = await UserModel.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.confirmEmail)
      return res.redirect(`${process.env.FRONT_URL}?message=already-verified`);

    user.confirmEmail = true;
    await user.save();

    return res.redirect(`${process.env.FRONT_URL}/login`);
  } catch (err) {
    return res.redirect(`${process.env.FRONT_URL}?message=invalid-token`);
  }
};


export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    user.resetCode = code;
    user.resetCodeExpires = expires;
    await user.save();

    const html = `<p>Your reset code is: <strong>${code}</strong></p>`;
    await sendEmail(user.email, "Reset Password", html);

    res.status(200).json({ message: "Reset code sent to your email." });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { code, newPassword } = req.body;
    const user = await UserModel.findOne({ resetCode: code });

    if (!user || user.resetCodeExpires < new Date())
      return res.status(400).json({ message: "Invalid or expired code" });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    return res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.accessToken = null;
    user.accessTokenExpiresAt = null;
    user.isLoggedIn = false;
    await user.save();

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

