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

  // ✅ بدل sizes + colors + quantity، نستخدم:
  variants: Joi.string()
  .custom((value, helpers) => {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        return helpers.message('"variants" must be an array');
      }

      for (const v of parsed) {
        if (
          typeof v.size !== "string" ||
          typeof v.color !== "string" ||
          typeof v.quantity !== "number"
        ) {
          return helpers.message('"variants" array is invalid');
        }
      }

      return value; // ✅ validation passed
    } catch (e) {
      return helpers.message('"variants" must be a valid JSON array');
    }
  })
  .required(),


}).unknown(true);




// 🆙 لتحديث منتج
export const updateProductSchema = Joi.object({
  title: Joi.string().allow('').optional(),
  description: Joi.string().allow('').optional(),

  originalPrice: Joi.number().positive().optional(),
  price: Joi.number().positive(), // عادة بيتحسب تلقائي بس حاطينه اختياري

  discount: Joi.string().custom((value, helpers) => {
    try {
      const parsed = JSON.parse(value);
      if (
        typeof parsed !== 'object' ||
        !parsed.type ||
        !parsed.amount ||
        !["percentage", "fixed"].includes(parsed.type) ||
        typeof parsed.amount !== "number" ||
        parsed.amount <= 0
      ) {
        return helpers.message('"discount" must be a valid object with type and amount');
      }
      return value;
    } catch {
      return helpers.message('"discount" must be a valid JSON object');
    }
  }).optional(),

  category: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),

  variants: Joi.string().custom((value, helpers) => {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        return helpers.message('"variants" must be an array');
      }
      for (const v of parsed) {
        if (
          typeof v.size !== "string" ||
          typeof v.color !== "string" ||
          typeof v.quantity !== "number"
        ) {
          return helpers.message('"variants" array is invalid');
        }
      }
      return value;
    } catch {
      return helpers.message('"variants" must be a valid JSON array');
    }
  }).optional(),
}).unknown(true);
