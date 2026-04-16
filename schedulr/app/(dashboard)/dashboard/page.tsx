import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  TrendingUp,
  Users,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatDuration } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      eventTypes: { where: { hidden: false }, take: 5 },
      bookings: {
        where: {
          status: { in: ["ACCEPTED", "PENDING"] },
          startTime: { gte: new Date() },
        },
        orderBy: { startTime: "asc" },
        take: 5,
        include: { eventType: true },
      },
    },
  });

  if (!user) redirect("/login");

  // Stats
  const [totalBookings, thisMonthBookings, cancelledBookings] = await Promise.all([
    db.booking.count({ where: { userId: user.id } }),
    db.booking.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    db.booking.count({
      where: { userId: user.id, status: "CANCELLED" },
    }),
  ]);

  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Good morning, {firstName} 👋</h1>
          <p className="text-slate-500 text-sm mt-1">Here&apos;s what&apos;s happening with your schedule.</p>
        </div>
        <Link href="/dashboard/events/new">
          <Button className="bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="w-4 h-4" />
            New event type
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Bookings", value: totalBookings, icon: Calendar, color: "violet", delta: "+12%" },
          { label: "This Month", value: thisMonthBookings, icon: TrendingUp, color: "emerald", delta: "+8%" },
          { label: "Event Types", value: user.eventTypes.length, icon: Users, color: "blue", delta: null },
          { label: "Cancelled", value: cancelledBookings, icon: XCircle, color: "red", delta: "-3%" },
        ].map((stat) => (
          <Card key={stat.label} className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500">{stat.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${stat.color}-50`}>
                  <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                {stat.delta && (
                  <span className={`text-xs font-medium mb-0.5 ${stat.delta.startsWith("+") ? "text-emerald-600" : "text-red-500"}`}>
                    {stat.delta}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming bookings */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upcoming Bookings</CardTitle>
              <Link href="/dashboard/bookings" className="text-xs text-violet-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.bookings.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No upcoming bookings</p>
                <Link href={`/u/${user.username}`} className="text-xs text-violet-600 hover:underline mt-1 block">
                  Share your booking page →
                </Link>
              </div>
            ) : (
              user.bookings.map((booking) => (
                <div key={booking.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{booking.attendeeName}</p>
                    <p className="text-xs text-slate-500">{booking.eventType.title} · {formatDuration(booking.eventType.length)}</p>
                    <p className="text-xs text-violet-600 mt-0.5">{formatDateTime(booking.startTime)}</p>
                  </div>
                  <Badge variant={booking.status === "ACCEPTED" ? "success" : "warning"} className="text-xs flex-shrink-0">
                    {booking.status === "ACCEPTED" ? "Confirmed" : "Pending"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Event types */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Your Event Types</CardTitle>
              <Link href="/dashboard/events/new" className="text-xs text-violet-600 hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> New
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.eventTypes.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm mb-3">Create your first event type</p>
                <Link href="/dashboard/events/new">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
                    <Plus className="w-3.5 h-3.5" /> Create event type
                  </Button>
                </Link>
              </div>
            ) : (
              user.eventTypes.map((et) => (
                <div key={et.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors group">
                  <div className="w-2 h-8 rounded-full bg-violet-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{et.title}</p>
                    <p className="text-xs text-slate-500">{formatDuration(et.length)} · {et.price > 0 ? `$${et.price / 100}` : "Free"}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/u/${user.username}/${et.slug}`} target="_blank" className="text-xs text-violet-600 hover:underline">
                      Preview
                    </Link>
                    <Link href={`/dashboard/events/${et.id}`} className="text-xs text-slate-500 hover:underline">
                      Edit
                    </Link>
                  </div>
                  {et.hidden ? (
                    <Badge variant="secondary" className="text-xs">Hidden</Badge>
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick setup checklist */}
      {user.eventTypes.length === 0 && (
        <Card className="border-violet-200 bg-violet-50/50">
          <CardHeader>
            <CardTitle className="text-base text-violet-900">Get set up in 3 steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Create an event type", desc: "Set duration, price, and availability", href: "/dashboard/events/new", done: user.eventTypes.length > 0 },
                { step: "2", title: "Set your availability", desc: "Define your working hours", href: "/dashboard/availability", done: false },
                { step: "3", title: "Share your page", desc: `schedulr.app/u/${user.username}`, href: `/u/${user.username}`, done: false },
              ].map((s) => (
                <Link key={s.step} href={s.href} className={`p-4 rounded-xl border transition-all ${s.done ? "border-emerald-200 bg-white opacity-60" : "border-violet-200 bg-white hover:border-violet-400 hover:shadow-sm"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${s.done ? "bg-emerald-100 text-emerald-600" : "bg-violet-100 text-violet-600"}`}>
                      {s.done ? "✓" : s.step}
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{s.title}</span>
                  </div>
                  <p className="text-xs text-slate-500">{s.desc}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
