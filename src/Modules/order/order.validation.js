import Joi from "joi";
import { Governorates } from "../../utils/governorates.js";

export const createOrderSchema = Joi.object({
  fullName: Joi.string().min(3).max(100).required(),
  phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).required(),
  anotherPhone: Joi.string().allow("", null).pattern(/^\+?[0-9]{7,15}$/).optional(),
  addressLine: Joi.string().min(5).max(255).required(),
  city: Joi.string().min(2).max(100).required(),
  gov: Joi.string().valid(...Governorates).required(),
  country: Joi.string().default("Egypt").optional(),

  notes: Joi.string().allow("",null).optional(),
  paymentMethod: Joi.string().valid("cash", "card").default("cash"),
});


export const updateOrderStatusSchema = Joi.object({
  id: Joi.string().length(24).hex().required(),
  status: Joi.string().valid(
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled"
  ).required()
});

export const deleteOrderSchema = Joi.object({
  id: Joi.string().length(24).hex().required()
});
