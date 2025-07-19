import Joi from "joi";

export const addToCartSchema = Joi.object({
  productId: Joi.string().length(24).hex().required(),
  quantity: Joi.number().integer().min(1).default(1),
  color: Joi.string().required(),
  size: Joi.string().required()
});


export const removeFromCartSchema = Joi.object({
  productId: Joi.string().length(24).hex().required(), 
  color: Joi.string().required(),
  size: Joi.string().required()
});

export const updateQuantityBodySchema = Joi.object({
  productId: Joi.string().length(24).hex().required(), 
  quantity: Joi.number().integer().min(0).required(),
  color: Joi.string().required(),
  size: Joi.string().required()
});
