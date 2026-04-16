import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  Search,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatTime, formatDuration } from "@/lib/utils";

const STATUS_STYLES = {
  ACCEPTED: { label: "Confirmed", variant: "success" as const },
  PENDING: { label: "Pending", variant: "warning" as const },
  CANCELLED: { label: "Cancelled", variant: "destructive" as const },
  REJECTED: { label: "Rejected", variant: "destructive" as const },
  AWAITING_HOST: { label: "Awaiting you", variant: "info" as const },
};

export default async function BookingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const bookings = await db.booking.findMany({
    where: { userId: session.user.id },
    orderBy: { startTime: "desc" },
    include: { eventType: true },
    take: 50,
  });

  const upcoming = bookings.filter(
    (b) => b.startTime >= new Date() && b.status !== "CANCELLED"
  );
  const past = bookings.filter(
    (b) => b.startTime < new Date() || b.status === "CANCELLED"
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
          <p className="text-slate-500 text-sm mt-1">
            {upcoming.length} upcoming · {past.length} past
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search bookings..."
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4 text-slate-400" />
            Filter
          </button>
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Past</h2>
          <div className="space-y-3">
            {past.map((b) => (
              <BookingRow key={b.id} booking={b} isPast />
            ))}
          </div>
        </section>
      )}

      {bookings.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No bookings yet</h3>
            <p className="text-slate-500 text-sm">Share your booking page to start getting bookings.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BookingRow({
  booking,
  isPast = false,
}: {
  booking: {
    id: string;
    uid: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeePhone?: string | null;
    startTime: Date;
    endTime: Date;
    status: string;
    location?: string | null;
    paid: boolean;
    eventType: { title: string; length: number };
  };
  isPast?: boolean;
}) {
  const statusInfo = STATUS_STYLES[booking.status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.ACCEPTED;

  return (
    <div className={`bg-white border rounded-xl p-4 flex items-center gap-4 hover:border-violet-200 transition-all ${isPast ? "opacity-70" : ""}`}>
      {/* Date block */}
      <div className="w-14 h-14 rounded-xl bg-violet-50 border border-violet-100 flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-violet-600 uppercase">
          {new Date(booking.startTime).toLocaleDateString("en", { month: "short" })}
        </span>
        <span className="text-xl font-bold text-violet-900 leading-none">
          {new Date(booking.startTime).getDate()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-slate-900">{booking.attendeeName}</h3>
          <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
          {booking.paid && <Badge variant="success" className="text-xs">Paid</Badge>}
        </div>
        <p className="text-sm text-slate-600 mb-1">{booking.eventType.title} · {formatDuration(booking.eventType.length)}</p>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
          </span>
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {booking.attendeeEmail}
          </span>
          {booking.attendeePhone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {booking.attendeePhone}
            </span>
          )}
          {booking.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {booking.location}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isPast && booking.status !== "CANCELLED" && (
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/bookings/${booking.uid}`}
            className="text-xs text-violet-600 hover:underline"
          >
            View
          </Link>
          <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <MoreHorizontal className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}
    </div>
  );
}
