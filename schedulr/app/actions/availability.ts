"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveAvailability({
  availabilityId,
  userId,
  schedule,
}: {
  availabilityId?: string;
  userId: string;
  schedule: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
}) {
  if (availabilityId) {
    await db.availability.update({
      where: { id: availabilityId },
      data: { schedule },
    });
  } else {
    await db.availability.create({
      data: {
        userId,
        name: "Working Hours",
        isDefault: true,
        schedule,
        dateOverrides: [],
      },
    });
  }

  revalidatePath("/dashboard/availability");
  return { success: true };
}
