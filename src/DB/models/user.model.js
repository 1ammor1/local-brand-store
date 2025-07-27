import mongoose from "mongoose";

export const roles = {
  user: "user",
  admin: "admin",
};

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: Object.values(roles), default: roles.user },
    confirmEmail: { type: Boolean, default: false },
    accessToken: { type: String },
    accessTokenExpiresAt: { type: Date },
    lastLogin: { type: Date },
    resetCode: { type: String },
    resetCodeExpires: { type: Date },
  },
  { timestamps: true }
);


export const UserModel = mongoose.model("User", userSchema);
