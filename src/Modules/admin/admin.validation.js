import Joi from "joi";
import { isVaildObjectId } from "../../middleware/validation.middleware.js";
import { roles } from "../../DB/models/user.model.js";

export const promoteUserSchema = Joi.object({
  id: Joi.string().custom(isVaildObjectId).required()
});

export const deleteUserSchema = Joi.object({
  id: Joi.string().custom(isVaildObjectId).required()
});
