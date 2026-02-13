import { z } from "zod/v4";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(3).max(100),
});

export const otpSchema = z.object({
  email: z.string().email(),
  otp: z.string,
});
