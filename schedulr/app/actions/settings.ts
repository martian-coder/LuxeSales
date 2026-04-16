"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateProfile({
  userId,
  name,
  bio,
  username,
  timeZone,
}: {
  userId: string;
  name: string;
  bio: string;
  username: string;
  timeZone: string;
}) {
  // Check username uniqueness
  const existing = await db.user.findFirst({
    where: { username, NOT: { id: userId } },
  });
  if (existing) {
    return { error: "This username is already taken." };
  }

  await db.user.update({
    where: { id: userId },
    data: { name, bio, username, timeZone },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath(`/u/${username}`);
  return { success: true };
}
