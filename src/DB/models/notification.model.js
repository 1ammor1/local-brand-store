import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Types.ObjectId, ref: "User" },
  order: { type: mongoose.Types.ObjectId, ref: "Order" },
  title: String,
  message: String,
  createdAt: { type: Date, default: Date.now, expires: "30d" },
});

export const NotificationModel = mongoose.model("Notification", notificationSchema);