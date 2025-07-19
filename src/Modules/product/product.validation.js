import Joi from "joi";

export const createProductSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(1000).required(),
  originalPrice: Joi.number().positive().required(),
  price: Joi.number().positive().optional(),

  discount: Joi.object({
    type: Joi.string().valid("percentage", "fixed").required(),
    amount: Joi.number().positive().required()
  }).optional(),

  category: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),

  sizes: Joi.array().items(Joi.string()).min(1).required(),
  colors: Joi.array().items(Joi.string()).min(1).required(),
  quantity: Joi.number().integer().min(1).required(),
});



// 🆙 لتحديث منتج
export const updateProductSchema = Joi.object({
  title: Joi.string().min(3).max(100),
  description: Joi.string().max(1000),

  originalPrice: Joi.number().positive(),
  price: Joi.number().positive(),

  discount: Joi.alternatives().try(
    Joi.object({
      type: Joi.string().valid("percentage", "fixed").required(),
      amount: Joi.number().positive().required()
    }),
    Joi.valid(null)
  ).optional(), 

  quantity: Joi.number().integer().min(0),
  category: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  colors: Joi.array().items(Joi.string()),
  size: Joi.array().items(Joi.string()),
}).unknown(true);
