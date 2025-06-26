import express from "express";
import * as couponController from "./discount.controller.js";
import { authentication, allowedRoles } from "../../middleware/authentication.middleware.js";
import validation from "../../middleware/validation.middleware.js";
import * as couponValidation from "./discount.validation.js"

const router = express.Router();

router.patch("/:productId/apply",authentication, allowedRoles("admin"), validation(couponValidation.discountSchema), couponController.applyDiscount); 
router.patch("/:productId/remove",authentication, allowedRoles("admin"), validation(couponValidation.discountSchema), couponController.applyDiscount);

export default router;
