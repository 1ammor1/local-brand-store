import Joi from "joi";
import { Governorates } from "../../utils/governorates.js";

export const previewCheckoutSchema = Joi.object({
  shippingAddress: Joi.object({
    fullName: Joi.string().min(3).max(100).required(),
    phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).required(),
    anotherPhone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).optional(),
    addressLine: Joi.string().min(5).max(255).required(),
    city: Joi.string().min(2).max(100).required(),
    gov: Joi.string().valid(...Governorates).required(), 
    country: Joi.string().valid("Egypt").required(),
  }).required(),

  notes: Joi.string().optional(),
});
