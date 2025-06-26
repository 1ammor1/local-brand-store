import Joi from "joi";

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