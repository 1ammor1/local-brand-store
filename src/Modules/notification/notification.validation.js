import Joi from "joi";
import { isVaildObjectId } from "../../middleware/validation.middleware.js";

export const notificationIdSchema = Joi.object({
  id: Joi.string().custom(isVaildObjectId).required()
});
