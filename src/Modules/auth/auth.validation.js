import joi from "joi";

export const registerSchema = joi.object({
  firstName: joi.string().min(2).max(30).required(),
  lastName:  joi.string().min(2).max(30).required(),
  email:     joi.string().email().required(),
  password:  joi.string().min(6).required()
});

export const loginSchema = joi.object({
  email:    joi.string().email().pattern(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  ).required(),
  password: joi.string().required()
});

export const forgotPasswordSchema = joi.object({
  email: joi.string().email().pattern(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  ).required(),
});

export const resetPasswordSchema = joi.object({
  code: joi.string().required(),
  newPassword: joi.string().min(6).required(),
});
