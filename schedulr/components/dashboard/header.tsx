"use client";

import { ExternalLink, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface HeaderProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
}

export function DashboardHeader({ user }: HeaderProps) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between gap-4">
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search bookings, events..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4 text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-600 rounded-full" />
        </Button>

        <Link
          href="/me"
          target="_blank"
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600 transition-colors border border-slate-200 rounded-lg px-3 py-1.5 hover:border-violet-200 hover:bg-violet-50"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View my page
        </Link>
      </div>
    </header>
  );
}
