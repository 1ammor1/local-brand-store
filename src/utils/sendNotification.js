import { NotificationModel } from "../Models/notification.model.js";

export const sendNotification = async ({ recipient, message, type = "other", relatedOrder = null }) => {
  try {
    const notification = new NotificationModel({
      recipient,
      message,
      type,
      relatedOrder,
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
};
