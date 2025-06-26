import express from "express";
import { authentication } from "../../middleware/authentication.middleware.js";
import {
  getNotifications,
  deleteNotification,
  clearNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./notification.controller.js";
import validation from "../../middleware/validation.middleware.js";
import * as notificationValidation from "./notification.validation.js"

const router = express.Router();

router.get("/", authentication, getNotifications);
router.get("/unread-count", authentication, getUnreadNotificationsCount);
router.patch("/mark-all-read", authentication, markAllNotificationsAsRead);
router.delete("/clear", authentication, clearNotifications);
router.patch("/mark-read/:id", authentication, validation(notificationValidation.notificationIdSchema), markNotificationAsRead);
router.delete("/:id", authentication, validation(notificationValidation.notificationIdSchema), deleteNotification);


export default router;
