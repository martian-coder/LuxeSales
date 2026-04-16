"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createBooking({
  eventTypeId,
  userId,
  attendeeName,
  attendeeEmail,
  startTime,
  endTime,
  notes,
  customResponses,
  timezone,
}: {
  eventTypeId: string;
  userId: string;
  attendeeName: string;
  attendeeEmail: string;
  startTime: string;
  endTime: string;
  notes?: string;
  customResponses?: Record<string, string>;
  timezone: string;
}) {
  // Validate event type exists
  const eventType = await db.eventType.findUnique({
    where: { id: eventTypeId },
  });

  if (!eventType) {
    return { success: false, error: "Event type not found" };
  }

  // Check for conflicts
  const start = new Date(startTime);
  const end = new Date(endTime);

  const conflict = await db.booking.findFirst({
    where: {
      userId,
      status: { in: ["ACCEPTED", "PENDING"] },
      OR: [
        { startTime: { gte: start, lt: end } },
        { endTime: { gt: start, lte: end } },
        { AND: [{ startTime: { lte: start } }, { endTime: { gte: end } }] },
      ],
    },
  });

  if (conflict) {
    return { success: false, error: "This time slot is no longer available." };
  }

  // Check waitlist - if full, add to waitlist
  if (eventType.waitlistEnabled && eventType.waitlistMaxSize) {
    const bookingsCount = await db.booking.count({
      where: { eventTypeId, status: { in: ["ACCEPTED", "PENDING"] } },
    });
    if (bookingsCount >= eventType.waitlistMaxSize) {
      await db.waitlistEntry.create({
        data: {
          eventTypeId,
          email: attendeeEmail,
          name: attendeeName,
        },
      });
      return {
        success: true,
        waitlisted: true,
        booking: null,
      };
    }
  }

  const booking = await db.booking.create({
    data: {
      title: `${attendeeName} - ${eventType.title}`,
      startTime: start,
      endTime: end,
      attendeeName,
      attendeeEmail,
      attendeeTimeZone: timezone,
      description: notes,
      customResponses: customResponses ?? {},
      userId,
      eventTypeId,
      status: eventType.requiresConfirmation ? "AWAITING_HOST" : "ACCEPTED",
    },
  });

  revalidatePath(`/dashboard/bookings`);

  // TODO: Send confirmation email via Resend
  // await sendConfirmationEmail({ booking, eventType, hostName });

  return { success: true, booking };
}

export async function cancelBooking({
  bookingUid,
  reason,
  cancelledBy,
}: {
  bookingUid: string;
  reason?: string;
  cancelledBy: "host" | "attendee";
}) {
  const booking = await db.booking.findUnique({
    where: { uid: bookingUid },
    include: { eventType: true },
  });

  if (!booking) return { success: false, error: "Booking not found" };

  await db.booking.update({
    where: { uid: bookingUid },
    data: {
      status: "CANCELLED",
      cancellationReason: reason,
      cancelledAt: new Date(),
      cancelledBy,
    },
  });

  // Auto-notify waitlist if applicable
  if (booking.eventType.waitlistEnabled) {
    const next = await db.waitlistEntry.findFirst({
      where: { eventTypeId: booking.eventTypeId, notified: false },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await db.waitlistEntry.update({
        where: { id: next.id },
        data: { notified: true },
      });
      // TODO: Send waitlist notification email
    }
  }

  revalidatePath("/dashboard/bookings");
  return { success: true };
}

export async function markNoShow({ bookingId }: { bookingId: string }) {
  await db.booking.update({
    where: { id: bookingId },
    data: { noShow: true },
  });
  revalidatePath("/dashboard/bookings");
  return { success: true };
}

export async function confirmBooking({ bookingId }: { bookingId: string }) {
  await db.booking.update({
    where: { id: bookingId },
    data: { status: "ACCEPTED" },
  });
  revalidatePath("/dashboard/bookings");
  return { success: true };
}
