"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  LayoutDashboard,
  Clock,
  BookOpen,
  Settings,
  Package,
  Zap,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "Event Types", icon: Calendar },
  { href: "/dashboard/bookings", label: "Bookings", icon: BookOpen },
  { href: "/dashboard/availability", label: "Availability", icon: Clock },
  { href: "/dashboard/packages", label: "Packages", icon: Package },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-slate-900">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <span>Schedulr</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-violet-50 text-violet-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? "text-violet-600" : "text-slate-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade prompt (for free users) */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-semibold text-violet-900">Upgrade to Pro</span>
          </div>
          <p className="text-xs text-violet-600 mb-3">Unlock payments, waitlists, and unlimited event types.</p>
          <Link href="/dashboard/settings/billing" className="flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900 transition-colors">
            View plans <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* User */}
      <div className="p-4 border-t border-slate-100">
        <Link href="/dashboard/settings" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-violet-700">
            {getInitials(user.name ?? user.email ?? "U")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user.name ?? "User"}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </Link>
      </div>
    </aside>
  );
}
