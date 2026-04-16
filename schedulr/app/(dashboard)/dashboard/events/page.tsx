import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Clock,
  Edit2,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Video,
  Phone,
  MapPin,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration, formatPrice } from "@/lib/utils";

export default async function EventsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      eventTypes: {
        orderBy: { createdAt: "asc" },
        include: {
          _count: { select: { bookings: true } },
        },
      },
    },
  });

  if (!user) redirect("/login");

  const LOCATION_ICONS: Record<string, React.ElementType> = {
    ONLINE: Video,
    ZOOM: Video,
    GOOGLE_MEET: Video,
    IN_PERSON: MapPin,
    PHONE: Phone,
    CUSTOM: MapPin,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Event Types</h1>
          <p className="text-slate-500 text-sm mt-1">Create and manage your bookable meeting types.</p>
        </div>
        <Link href="/dashboard/events/new">
          <Button className="bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="w-4 h-4" /> New event type
          </Button>
        </Link>
      </div>

      {user.eventTypes.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No event types yet</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              Create your first event type to start accepting bookings. You can set the duration, price, and availability.
            </p>
            <Link href="/dashboard/events/new">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="w-4 h-4" /> Create first event type
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {user.eventTypes.map((et) => {
            const LocationIcon = LOCATION_ICONS[et.locationType] ?? Video;
            return (
              <div
                key={et.id}
                className={`bg-white border rounded-xl p-5 flex items-center gap-4 group hover:border-violet-200 transition-all ${et.hidden ? "opacity-60 border-slate-200" : "border-slate-200"}`}
              >
                {/* Color bar */}
                <div className="w-1.5 h-12 rounded-full bg-violet-400 flex-shrink-0" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{et.title}</h3>
                    {et.hidden && <Badge variant="secondary" className="text-xs">Hidden</Badge>}
                    {et.requiresConfirmation && <Badge variant="info" className="text-xs">Manual confirm</Badge>}
                    {et.paymentRequired && (
                      <Badge variant="success" className="text-xs gap-1">
                        <CreditCard className="w-2.5 h-2.5" />
                        {formatPrice(et.price, et.currency)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(et.length)}
                    </span>
                    <span className="flex items-center gap-1">
                      <LocationIcon className="w-3.5 h-3.5" />
                      {et.locationType.replace("_", " ").toLowerCase()}
                    </span>
                    <span>{et._count.bookings} booking{et._count.bookings !== 1 ? "s" : ""}</span>
                  </div>
                  <p className="text-xs text-violet-600 mt-1 font-mono">
                    schedulr.app/u/{user.username}/{et.slug}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/u/${user.username}/${et.slug}`} target="_blank">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {et.hidden ? <Eye className="w-3.5 h-3.5 text-slate-500" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  </Button>
                  <Link href={`/dashboard/events/${et.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan upsell */}
      {user.plan === "FREE" && user.eventTypes.length >= 1 && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold mb-1">Free plan: 1 event type limit reached</p>
              <p className="text-sm text-violet-200">Upgrade to Pro for unlimited event types, payments, and more.</p>
            </div>
            <Link href="/dashboard/settings/billing">
              <Button className="bg-white text-violet-700 hover:bg-violet-50 flex-shrink-0">
                Upgrade to Pro
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
