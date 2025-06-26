import Joi from "joi";

export const discountSchema = Joi.object({
  productId: Joi.string().length(24).hex().required(),
  
  type: Joi.string().valid("percentage", "fixed").allow(null).required(),

  amount: Joi.alternatives().conditional("type", {
    is: Joi.valid("percentage", "fixed"),
    then: Joi.number().positive().required(),
    otherwise: Joi.valid(null).required()
  })
});
