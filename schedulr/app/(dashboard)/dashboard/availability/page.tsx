import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AvailabilityEditor } from "@/components/dashboard/availability-editor";

export default async function AvailabilityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const availability = await db.availability.findFirst({
    where: { userId: session.user.id, isDefault: true },
  });

  const defaultSchedule = [
    { dayOfWeek: 0, enabled: false, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 1, enabled: true, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 2, enabled: true, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 3, enabled: true, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 4, enabled: true, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 5, enabled: true, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 6, enabled: false, startTime: "09:00", endTime: "17:00" },
  ];

  const schedule =
    availability?.schedule != null
      ? (availability.schedule as Array<{ dayOfWeek: number; startTime: string; endTime: string }>).map((s) => ({
          dayOfWeek: s.dayOfWeek,
          enabled: true,
          startTime: s.startTime,
          endTime: s.endTime,
        }))
      : defaultSchedule;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Availability</h1>
        <p className="text-slate-500 text-sm mt-1">
          Set when you&apos;re available for bookings. These apply to all your event types by default.
        </p>
      </div>
      <AvailabilityEditor
        availabilityId={availability?.id}
        initialSchedule={schedule}
        userId={session.user.id}
      />
    </div>
  );
}
