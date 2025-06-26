import express from "express";
import {
  getAllProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByCategory
} from "../product/product.controller.js";
import {
  authentication,
  allowedRoles,
} from "../../middleware/authentication.middleware.js";
import validation from "../../middleware/validation.middleware.js";
import * as productValidation from "./product.validation.js";
import { uploadCloud } from "../../middleware/multer.middleware.js";

const router = express.Router();

router.get("/", getAllProducts);
router.get("/by-category", getProductsByCategory);

router.get("/:id", getProductById);

router.post(
  "/",
  authentication,
  allowedRoles("admin", "seller"),
  uploadCloud("images", "uploads").array("images", 5),
  validation(productValidation.createProductSchema),
  createProduct
);

router.put(
  "/:id",
  authentication,
  allowedRoles("admin", "seller"),
  uploadCloud("images", "uploads").array("images", 5),
  validation(productValidation.updateProductSchema),
  updateProduct
);

router.delete(
  "/:id",
  authentication,
  allowedRoles("admin", "seller"),
  deleteProduct
);

export default router;
