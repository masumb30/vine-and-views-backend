import { z } from "zod";

const createUserSchema = z.object({
  body: z.object({
    name: z
      .string({ error: "Name is required" })
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),
    email: z
      .string({ error: "Email is required" })
      .email("Invalid email format"),
    role: z.enum(["user", "admin"]).optional().default("user"),
  }),
});

const updateUserSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .optional(),
    email: z.string().email("Invalid email format").optional(),
    role: z.enum(["user", "admin"]).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const UserValidation = {
  createUserSchema,
  updateUserSchema,
};
