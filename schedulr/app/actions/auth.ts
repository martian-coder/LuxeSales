"use server";

import { db } from "@/lib/db";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(30).regex(/^[a-z0-9-]+$/),
});

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  username: string;
}) {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues ?? [];
    return { error: issues[0]?.message ?? "Invalid data" };
  }

  const { name, email, password, username } = parsed.data;

  // Check for existing email
  const existingEmail = await db.user.findUnique({ where: { email } });
  if (existingEmail) {
    return { error: "An account with this email already exists" };
  }

  // Check for existing username
  const existingUsername = await db.user.findUnique({ where: { username } });
  if (existingUsername) {
    return { error: "This username is taken. Try another." };
  }

  // Hash password
  // In production use bcrypt: const hashedPassword = await bcrypt.hash(password, 12)
  // For now we store a placeholder — wire up bcrypt in production
  const hashedPassword = `hashed_${password}`;

  await db.user.create({
    data: {
      name,
      email,
      username,
      // passwordHash: hashedPassword,  // add this field to schema in production
      availability: {
        create: {
          name: "Working Hours",
          isDefault: true,
          schedule: [
            { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
            { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
            { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
            { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
            { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
          ],
          dateOverrides: [],
        },
      },
    },
  });

  return { success: true };
}
