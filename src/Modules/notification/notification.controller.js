import { NotificationModel } from "../../DB/models/notification.model.js";

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await NotificationModel.find({ recipient: req.user.id })
      .sort({ createdAt: -1 });
    res.status(200).json({ notifications });
  } catch (err) {
    next(err);
  }
};
export const getUnreadNotificationsCount = async (req, res, next) => {
  try {
    const count = await NotificationModel.countDocuments({
      recipient: req.user.id,
      read: false,
    });

    res.status(200).json({ count });
  } catch (err) {
    next(err);
  }
};
export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    await NotificationModel.updateMany(
      { recipient: req.user.id, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
};

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notif = await NotificationModel.findOneAndUpdate(
      { _id: id, recipient: req.user.id },
      { $set: { read: true } },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Notification marked as read", notif });
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await NotificationModel.findOneAndDelete({
      _id: id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted" });
  } catch (err) {
    next(err);
  }
};

export const clearNotifications = async (req, res, next) => {
  try {
    await NotificationModel.deleteMany({ recipient: req.user.id });
    res.status(200).json({ message: "All notifications cleared" });
  } catch (err) {
    next(err);
  }
};
