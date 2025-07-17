import express from "express";
import { createOrder, getAllOrders,getOrdersByStatus,getSingleOrder, getUserOrders, updateOrderStatus , deleteOrder,cancelOrder } from "./order.controller.js";
import { authentication, allowedRoles } from "../../middleware/authentication.middleware.js";
import validation from "../../middleware/validation.middleware.js";
import * as orderValidation from "./order.validation.js"
const router = express.Router();

router.post("/", authentication,validation(orderValidation.createOrderSchema), createOrder);

router.get("/user", authentication, getUserOrders);

router.get("/all", authentication, allowedRoles("admin"), getAllOrders);

router.get("/orders", authentication, allowedRoles("admin"), getOrdersByStatus);

router.patch("/:id/cancel", authentication,cancelOrder);

router.patch("/:id/status", authentication, allowedRoles("admin"),validation(orderValidation.updateOrderStatusSchema), updateOrderStatus);

router.patch("/:id/cancel", authentication,cancelOrder);

router.get("/:id", authentication, getSingleOrder);

router.delete("/:id", authentication, allowedRoles("admin"),validation(orderValidation.deleteOrderSchema), deleteOrder);

export default router;
