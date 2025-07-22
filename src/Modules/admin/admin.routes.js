import express from "express";
import { 
  getAllUsers, 
  promoteUser, 
  deleteUser,
  getExtendedStats
} from "./admin.controller.js";
import { authentication, allowedRoles } from "../../middleware/authentication.middleware.js";
import validation from "../../middleware/validation.middleware.js";
import * as adminValidation from "./admin.validation.js"

const router = express.Router();

router.use(authentication, allowedRoles("admin"));

router.get("/users", getAllUsers);
router.put("/users/:id/promote",validation(adminValidation.promoteUserSchema), promoteUser);
router.delete("/users/:id", validation(adminValidation.deleteUserSchema), deleteUser);
router.get("/extended-stats", authentication, allowedRoles("admin"), getExtendedStats);

export default router;
