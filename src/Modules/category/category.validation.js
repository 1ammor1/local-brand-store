import Joi from "joi";

export const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(50).required()
});

export const updateCategoryBodySchema = Joi.object({
  id: Joi.string().length(24).hex().required(),
  name: Joi.string().min(2).max(50).optional()
});

export const deleteCategoryParamsSchema = Joi.object({
  id: Joi.string().length(24).hex().required()
});
