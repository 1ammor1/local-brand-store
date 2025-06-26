import express from "express";
import { authentication } from "../../middleware/authentication.middleware.js";
import * as userController from "./user.controller.js";
import validation from "../../middleware/validation.middleware.js";
import * as userValidation from "./user.validation.js";

const router = express.Router();

router.get("/profile", authentication, userController.getProfile);
router.put(
  "/profile",
  authentication,
  validation(userValidation.updateProfileSchema),
  userController.updateProfile
);
router.get("/logout", authentication, userController.logout);

export default router;
