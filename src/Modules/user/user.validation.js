import Joi from "joi";

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(3).max(50).optional(),
  lastName: Joi.string().min(3).max(50).optional(),
  oldPassword: Joi.string().min(6).optional(),
  newPassword: Joi.when("oldPassword", {
    is: Joi.exist(),
    then: Joi.string().min(6).required().messages({
      "any.required": "New password is required when old password is provided",
    }),
    otherwise: Joi.forbidden(),
  }),
});
