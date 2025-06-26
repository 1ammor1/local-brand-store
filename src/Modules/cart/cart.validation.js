import Joi from "joi";

export const addToCartSchema = Joi.object({
  productId: Joi.string().length(24).hex().required(), 
  quantity: Joi.number().integer().min(1).default(1)
});

export const removeFromCartSchema = Joi.object({
  productId: Joi.string().length(24).hex().required(), 
});

export const updateQuantityBodySchema = Joi.object({
  productId: Joi.string().length(24).hex().required(), 
  quantity: Joi.number().integer().min(1).required()
});
