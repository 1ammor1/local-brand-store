import express from "express";
import * as authController from "./auth.controller.js";
import rateLimit from "express-rate-limit";
import * as authValidation from "./auth.validation.js"
import validation from "./../../middleware/validation.middleware.js"
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: {
    message: "Too many login attempts. Try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});


const router = express.Router();

router.post("/register" ,validation(authValidation.registerSchema),authController.register);
router.post("/login", validation(authValidation.loginSchema) ,loginLimiter,  authController.login);

router.post("/verify/send", authController.sendVerificationEmail);
router.get("/verify/:token", authController.verifyEmail);

router.post("/forgot-password",validation(authValidation.forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password",validation(authValidation.resetPasswordSchema), authController.resetPassword);


export default router;
