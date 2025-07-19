import { UserModel } from "../../DB/models/user.model.js";
import bcrypt from "bcrypt";

export const getProfile = async (req, res) => {
  const user = await UserModel.findById(req.user.id).select("-password");
  res.status(200).json({ user });
};

export const updateProfile = async (req, res) => {
  const { firstName, lastName, oldPassword, newPassword, email } = req.body;
  const user = await UserModel.findById(req.user.id);

  if (!user) return res.status(404).json({ message: "User not found" });

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;

  if (email && email !== user.email) {
    const existingEmail = await UserModel.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email is already in use" });
    }
    user.email = email;
  }

  if (oldPassword && newPassword) {
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(400).json({ message: "Old password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
  }

  await user.save();
  res.status(200).json({ message: "Profile updated successfully" });
};



export const logout = async (req, res) => {
  const id = req.user.id;
  const user = await UserModel.findById(id);
  user.isLoggedIn = false;
  user.accessToken = null;
  user.accessTokenExpiresAt = null;
  await user.save();
  return res.status(200).json({ message: "You are logged out!" });
};
