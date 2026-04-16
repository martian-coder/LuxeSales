import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, CreditCard, Globe, Video, Phone, MapPin } from "lucide-react";
import { formatDuration, formatPrice, getInitials } from "@/lib/utils";

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { username } = await params;
  const user = await db.user.findUnique({
    where: { username },
    select: { name: true, bio: true },
  });
  if (!user) return { title: "Not Found" };
  return {
    title: `Book with ${user.name ?? username}`,
    description: user.bio ?? `Schedule a meeting with ${user.name ?? username}`,
  };
}

const LOCATION_LABELS: Record<string, string> = {
  ONLINE: "Online",
  ZOOM: "Zoom",
  GOOGLE_MEET: "Google Meet",
  IN_PERSON: "In Person",
  PHONE: "Phone Call",
  CUSTOM: "Custom",
};

const LOCATION_ICONS: Record<string, React.ElementType> = {
  ONLINE: Video,
  ZOOM: Video,
  GOOGLE_MEET: Video,
  IN_PERSON: MapPin,
  PHONE: Phone,
  CUSTOM: Globe,
};

export default async function PublicProfilePage({ params }: { params: Params }) {
  const { username } = await params;

  const user = await db.user.findUnique({
    where: { username },
    include: {
      eventTypes: {
        where: { hidden: false },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Minimal nav */}
      <nav className="border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 w-fit">
          <div className="w-6 h-6 bg-violet-600 rounded flex items-center justify-center">
            <Calendar className="w-3 h-3 text-white" />
          </div>
          Schedulr
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Host profile */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
            {getInitials(user.name ?? user.email ?? "U")}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{user.name ?? username}</h1>
          {user.bio && (
            <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">{user.bio}</p>
          )}
        </div>

        {/* Event types */}
        {user.eventTypes.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Calendar className="w-10 h-10 mx-auto mb-4 opacity-40" />
            <p>No event types available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {user.eventTypes.map((et) => {
              const LocationIcon = LOCATION_ICONS[et.locationType] ?? Video;
              return (
                <Link
                  key={et.id}
                  href={`/u/${username}/${et.slug}`}
                  className="block bg-white rounded-2xl border border-slate-200 p-5 hover:border-violet-300 hover:shadow-md hover:shadow-violet-50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h2 className="text-base font-semibold text-slate-900 group-hover:text-violet-700 transition-colors mb-2">
                        {et.title}
                      </h2>
                      {et.description && (
                        <p className="text-sm text-slate-500 mb-3 line-clamp-2">{et.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatDuration(et.length)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <LocationIcon className="w-3.5 h-3.5 text-slate-400" />
                          {LOCATION_LABELS[et.locationType]}
                        </span>
                        {et.paymentRequired && (
                          <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                            <CreditCard className="w-3.5 h-3.5" />
                            {formatPrice(et.price, et.currency)}
                          </span>
                        )}
                        {!et.paymentRequired && (
                          <span className="text-emerald-600 font-medium">Free</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 w-10 h-10 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center group-hover:bg-violet-600 group-hover:border-violet-600 transition-all">
                      <svg className="w-4 h-4 text-violet-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Powered by */}
        {!user.hideBranding && (
          <div className="text-center mt-10">
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
