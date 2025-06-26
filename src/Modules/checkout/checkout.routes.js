import express from "express";
import { authentication } from "../../middleware/authentication.middleware.js";
import { previewCheckout } from "./checkout.controller.js";
import validation from "../../middleware/validation.middleware.js";
import * as checkoutValidation from "./checkout.validation.js"
const router = express.Router();

router.post("/", authentication,validation(checkoutValidation.previewCheckoutSchema), previewCheckout);

export default router;
