"use client";

import { useState, useMemo } from "react";
import {
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  isToday,
  format,
  addMonths,
  subMonths,
  setHours,
  setMinutes,
  parseISO,
  addMinutes,
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBooking } from "@/app/actions/bookings";
import { cn, formatDate, formatTime } from "@/lib/utils";

type ScheduleSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type CustomInput = {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea" | "select" | "radio" | "checkbox";
  required: boolean;
  options?: string[];
};

interface BookingCalendarProps {
  eventTypeId: string;
  userId: string;
  username: string;
  eventSlug: string;
  durationMinutes: number;
  schedule: ScheduleSlot[];
  existingBookings: Array<{ startTime: string; endTime: string }>;
  minimumBookingNotice: number;
  beforeBuffer: number;
  afterBuffer: number;
  bookingWindowDays: number;
  slotInterval?: number;
  customInputs: CustomInput[] | null;
  paymentRequired: boolean;
  price: number;
  currency: string;
  requiresConfirmation: boolean;
}

type BookingStep = "calendar" | "time" | "form" | "confirmed";

export function BookingCalendar({
  eventTypeId,
  userId,
  username,
  eventSlug,
  durationMinutes,
  schedule,
  existingBookings,
  minimumBookingNotice,
  beforeBuffer,
  afterBuffer,
  bookingWindowDays,
  slotInterval,
  customInputs,
  paymentRequired,
  price,
  currency,
  requiresConfirmation,
}: BookingCalendarProps) {
  const [step, setStep] = useState<BookingStep>("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [customResponses, setCustomResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    uid: string;
    startTime: Date;
  } | null>(null);

  const now = new Date();
  const minNoticeDate = addMinutes(now, minimumBookingNotice);
  const maxDate = addDays(now, bookingWindowDays);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Check if a day has availability
  const isDayAvailable = (date: Date): boolean => {
    if (isBefore(date, new Date(now.toDateString()))) return false;
    if (isBefore(maxDate, date)) return false;
    const dayOfWeek = date.getDay();
    return schedule.some((s) => s.dayOfWeek === dayOfWeek);
  };

  // Generate time slots for a selected date
  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dayOfWeek = selectedDate.getDay();
    const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek);
    if (!daySchedule) return [];

    const [startH, startM] = daySchedule.startTime.split(":").map(Number);
    const [endH, endM] = daySchedule.endTime.split(":").map(Number);

    const slotDuration = slotInterval ?? durationMinutes;
    const slots: Date[] = [];

    let current = setMinutes(setHours(selectedDate, startH), startM);
    const end = setMinutes(setHours(selectedDate, endH), endM);

    while (addMinutes(current, durationMinutes) <= end) {
      const slotEnd = addMinutes(current, durationMinutes + afterBuffer);

      // Check minimum notice
      if (isBefore(current, minNoticeDate)) {
        current = addMinutes(current, slotDuration);
        continue;
      }

      // Check conflicts with existing bookings
      const hasConflict = existingBookings.some((b) => {
        const bStart = parseISO(b.startTime);
        const bEnd = parseISO(b.endTime);
        const slotStart = addMinutes(current, -beforeBuffer);
        return slotStart < bEnd && slotEnd > bStart;
      });

      if (!hasConflict) {
        slots.push(new Date(current));
      }

      current = addMinutes(current, slotDuration);
    }

    return slots;
  }, [selectedDate, schedule, durationMinutes, slotInterval, existingBookings, minNoticeDate, beforeBuffer, afterBuffer]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep("time");
  };

  const handleTimeSelect = (time: Date) => {
    setSelectedTime(time);
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      const result = await createBooking({
        eventTypeId,
        userId,
        attendeeName: name,
        attendeeEmail: email,
        startTime: selectedTime.toISOString(),
        endTime: addMinutes(selectedTime, durationMinutes).toISOString(),
        notes,
        customResponses,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (result.success && result.booking) {
        setConfirmationData({
          uid: result.booking.uid,
          startTime: selectedTime,
        });
        setStep("confirmed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Confirmed screen ──
  if (step === "confirmed" && confirmationData) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {requiresConfirmation ? "Booking requested!" : "Booking confirmed!"}
        </h2>
        <p className="text-slate-500 mb-6 text-sm">
          {requiresConfirmation
            ? "We've notified the host. You'll receive a confirmation email once they approve."
            : `A confirmation email has been sent to ${email}`}
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-left w-full max-w-sm mb-6">
          <p className="text-slate-500 text-xs uppercase font-semibold mb-2">Booking Details</p>
          <p className="font-medium text-slate-900">{formatDate(confirmationData.startTime)}</p>
          <p className="text-slate-600">{formatTime(confirmationData.startTime)}</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">Ref: {confirmationData.uid}</p>
        </div>
        <div className="flex gap-3">
          <a href={`/u/${username}`}>
            <Button variant="outline" size="sm">Book another time</Button>
          </a>
        </div>
      </div>
    );
  }

  // ── Form step ──
  if (step === "form" && selectedTime) {
    return (
      <div className="p-8">
        <button
          onClick={() => setStep("time")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-violet-900">{formatDate(selectedTime)}</p>
          <p className="text-sm text-violet-600">{formatTime(selectedTime)}</p>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 mb-6">Your details</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="book-name">Your name *</Label>
            <Input id="book-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Johnson" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="book-email">Email address *</Label>
            <Input id="book-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@example.com" required />
          </div>

          {/* Custom fields */}
          {customInputs?.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label htmlFor={`custom-${field.id}`}>
                {field.label} {field.required && "*"}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={`custom-${field.id}`}
                  value={customResponses[field.id] ?? ""}
                  onChange={(e) => setCustomResponses((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  required={field.required}
                />
              ) : (
                <Input
                  id={`custom-${field.id}`}
                  type={field.type}
                  value={customResponses[field.id] ?? ""}
                  onChange={(e) => setCustomResponses((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  required={field.required}
                />
              )}
            </div>
          ))}

          <div className="space-y-1.5">
            <Label htmlFor="book-notes">Additional notes</Label>
            <Textarea id="book-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the host should know..." className="resize-none" rows={3} />
          </div>

          {paymentRequired && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <p className="text-sm font-medium text-emerald-800 mb-1">
                Payment required: {price / 100} {currency.toUpperCase()}
              </p>
              <p className="text-xs text-emerald-600">You&apos;ll be redirected to Stripe after confirming.</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            loading={isSubmitting}
          >
            {paymentRequired ? "Continue to payment" : requiresConfirmation ? "Request booking" : "Confirm booking"}
          </Button>
        </form>
      </div>
    );
  }

  // ── Time step ──
  if (step === "time" && selectedDate) {
    return (
      <div className="p-8">
        <button
          onClick={() => setStep("calendar")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <p className="text-sm font-semibold text-slate-900 mb-4">{formatDate(selectedDate)}</p>

        {timeSlots.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">No available times on this day.</p>
            <button onClick={() => setStep("calendar")} className="text-violet-600 text-sm hover:underline mt-2">
              Choose another date
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
            {timeSlots.map((slot) => (
              <button
                key={slot.toISOString()}
                onClick={() => handleTimeSelect(slot)}
                className="py-2.5 px-4 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 transition-all text-center"
              >
                {formatTime(slot)}
              </button>
            ))}
          </div>
        )}

        {/* Jump to first available helper */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            {timeSlots.length} slot{timeSlots.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </div>
    );
  }

  // ── Calendar step ──
  return (
    <div className="p-8">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          disabled={isBefore(startOfMonth(subMonths(currentMonth, 1)), startOfMonth(now))}
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
        <h3 className="text-sm font-semibold text-slate-900">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const available = isDayAvailable(day);
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const selected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => available && isCurrentMonth && handleDateSelect(day)}
              disabled={!available || !isCurrentMonth}
              className={cn(
                "aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all",
                !isCurrentMonth && "opacity-0 pointer-events-none",
                selected && "bg-violet-600 text-white",
                !selected && available && isCurrentMonth && "hover:bg-violet-50 hover:text-violet-700 text-slate-900 cursor-pointer",
                !selected && !available && isCurrentMonth && "text-slate-300 cursor-not-allowed",
                today && !selected && "ring-2 ring-violet-200 bg-violet-50 text-violet-700"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 mt-6">
        Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
      </p>
    </div>
  );
}
