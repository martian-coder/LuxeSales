import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Calendar, Clock, Video, Phone, MapPin, Globe, ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";
import { formatDuration, formatPrice, getInitials } from "@/lib/utils";
import { BookingCalendar } from "@/components/booking/calendar";

type Params = Promise<{ username: string; slug: string }>;

const LOCATION_LABELS: Record<string, string> = {
  ONLINE: "Online meeting",
  ZOOM: "Zoom",
  GOOGLE_MEET: "Google Meet",
  IN_PERSON: "In Person",
  PHONE: "Phone call",
  CUSTOM: "Custom location",
};

const LOCATION_ICONS: Record<string, React.ElementType> = {
  ONLINE: Video,
  ZOOM: Video,
  GOOGLE_MEET: Video,
  IN_PERSON: MapPin,
  PHONE: Phone,
  CUSTOM: Globe,
};

export default async function BookingPage({ params }: { params: Params }) {
  const { username, slug } = await params;

  const user = await db.user.findUnique({
    where: { username },
    include: {
      availability: {
        where: { isDefault: true },
      },
    },
  });

  if (!user) notFound();

  const eventType = await db.eventType.findUnique({
    where: { userId_slug: { userId: user.id, slug } },
  });

  if (!eventType || eventType.hidden) notFound();

  const LocationIcon = LOCATION_ICONS[eventType.locationType] ?? Video;

  // Get availability schedule
  const availability = user.availability[0];
  const schedule = (availability?.schedule as Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }> | null) ?? [];

  // Get existing bookings for the next 60 days to block off times
  const now = new Date();
  const future = new Date(now);
  future.setDate(future.getDate() + eventType.bookingWindowDays);

  const existingBookings = await db.booking.findMany({
    where: {
      userId: user.id,
      startTime: { gte: now, lte: future },
      status: { in: ["ACCEPTED", "PENDING"] },
    },
    select: { startTime: true, endTime: true },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 w-fit">
          <div className="w-6 h-6 bg-violet-600 rounded flex items-center justify-center">
            <Calendar className="w-3 h-3 text-white" />
          </div>
          Schedulr
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <Link
          href={`/u/${username}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {user.name ?? username}&apos;s page
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid lg:grid-cols-[340px,1fr]">
            {/* Left: Event info */}
            <div className="p-8 border-r border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {getInitials(user.name ?? user.email ?? "U")}
                </div>
                <div>
                  <p className="text-sm text-slate-500">{user.name}</p>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 mb-3">{eventType.title}</h1>

              {eventType.description && (
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">{eventType.description}</p>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {formatDuration(eventType.length)}
                </div>
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <LocationIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {LOCATION_LABELS[eventType.locationType]}
                </div>
                {eventType.paymentRequired ? (
                  <div className="flex items-center gap-2.5 text-sm font-medium text-emerald-600">
                    <CreditCard className="w-4 h-4 flex-shrink-0" />
                    {formatPrice(eventType.price, eventType.currency)}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-sm font-medium text-emerald-600">
                    <CreditCard className="w-4 h-4 flex-shrink-0" />
                    Free
                  </div>
                )}
              </div>

              {eventType.requiresConfirmation && (
                <div className="mt-6 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-xs text-amber-700 font-medium">
                    ⚡ This event requires manual confirmation by the host.
                  </p>
                </div>
              )}
            </div>

            {/* Right: Calendar + booking */}
            <BookingCalendar
              eventTypeId={eventType.id}
              userId={user.id}
              username={username}
              eventSlug={slug}
              durationMinutes={eventType.length}
              schedule={schedule}
              existingBookings={existingBookings.map((b) => ({
                startTime: b.startTime.toISOString(),
                endTime: b.endTime.toISOString(),
              }))}
              minimumBookingNotice={eventType.minimumBookingNotice}
              beforeBuffer={eventType.beforeEventBuffer}
              afterBuffer={eventType.afterEventBuffer}
              bookingWindowDays={eventType.bookingWindowDays}
              slotInterval={eventType.slotInterval ?? undefined}
              customInputs={eventType.customInputs as Array<{
                id: string;
                label: string;
                type: "text" | "email" | "phone" | "textarea" | "select" | "radio" | "checkbox";
                required: boolean;
                options?: string[];
              }> | null}
              paymentRequired={eventType.paymentRequired}
              price={eventType.price}
              currency={eventType.currency}
              requiresConfirmation={eventType.requiresConfirmation}
            />
          </div>
        </div>

        {!user.hideBranding && (
          <div className="text-center mt-8">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
              <div className="w-4 h-4 bg-violet-600 rounded flex items-center justify-center">
                <Calendar className="w-2.5 h-2.5 text-white" />
              </div>
              Powered by Schedulr
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
