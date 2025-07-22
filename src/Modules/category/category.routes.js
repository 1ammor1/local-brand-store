import express from "express";
import * as categoryController from "../category/category.controller.js";
import { authentication, allowedRoles } from "../../middleware/authentication.middleware.js";
import validation from "../../middleware/validation.middleware.js";
import * as categoryValidation from "./category.validation.js"
const router = express.Router();

router.get("/", categoryController.getAllCategories);

router.post("/", authentication, allowedRoles("admin"), categoryController.createCategory);
router.put("/:id", authentication, allowedRoles("admin"), categoryController.updateCategory);
router.delete("/:id", authentication, allowedRoles("admin"), categoryController.deleteCategory);
router.get('/single/:id', categoryController.getCategoryById);



export default router;
