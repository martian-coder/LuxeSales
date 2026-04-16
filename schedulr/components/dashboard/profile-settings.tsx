"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { updateProfile } from "@/app/actions/settings";
import { Check, Zap, Calendar, Users, Building2 } from "lucide-react";

const PLAN_DETAILS = {
  FREE: { label: "Free", color: "secondary" as const, icon: Calendar },
  PRO: { label: "Pro", color: "default" as const, icon: Zap },
  TEAMS: { label: "Teams", color: "info" as const, icon: Users },
  ENTERPRISE: { label: "Enterprise", color: "info" as const, icon: Building2 },
};

interface ProfileSettingsProps {
  userId: string;
  initialName: string;
  initialBio: string;
  initialUsername: string;
  initialTimeZone: string;
  email: string;
  plan: "FREE" | "PRO" | "TEAMS" | "ENTERPRISE";
}

export function ProfileSettings({
  userId,
  initialName,
  initialBio,
  initialUsername,
  initialTimeZone,
  email,
  plan,
}: ProfileSettingsProps) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [username, setUsername] = useState(initialUsername);
  const [timeZone, setTimeZone] = useState(initialTimeZone);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const planInfo = PLAN_DETAILS[plan];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await updateProfile({ userId, name, bio, username, timeZone });
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Plan badge */}
      <Card className="border-slate-200">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <planInfo.icon className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Current plan</p>
              <p className="text-sm text-slate-500">
                {plan === "FREE" ? "Free forever · 1 event type" : `${planInfo.label} · All features unlocked`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={planInfo.color}>{planInfo.label}</Badge>
            {plan === "FREE" && (
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
                Upgrade to Pro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>This is how you appear on your public booking page.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-name">Full name</Label>
                <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Johnson" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-username">Username</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-xs text-slate-400">schedulr.app/u/</span>
                  <Input id="s-username" className="pl-28" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" type="email" value={email} disabled className="bg-slate-50 text-slate-500" />
              <p className="text-xs text-slate-400">Email cannot be changed here.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-bio">Bio</Label>
              <Textarea id="s-bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell visitors what you do and how you can help them..." className="resize-none" rows={4} maxLength={300} />
              <p className="text-xs text-slate-400">{bio.length}/300</p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex items-center justify-end">
              <Button
                type="submit"
                loading={isPending}
                className={saved ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"}
              >
                {saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Integrations */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect your calendar and video conferencing tools.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { name: "Google Calendar", desc: "Two-way sync with Google Calendar", connected: false, icon: "🗓️" },
            { name: "Microsoft Outlook", desc: "Two-way sync with Outlook Calendar", connected: false, icon: "📅" },
            { name: "Zoom", desc: "Auto-create Zoom links for meetings", connected: false, icon: "📹" },
            { name: "Stripe", desc: "Accept payments for your sessions", connected: false, icon: "💳", proOnly: true },
          ].map((integration) => (
            <div key={integration.name} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{integration.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{integration.name}</p>
                    {integration.proOnly && <Badge variant="secondary" className="text-xs">Pro</Badge>}
                  </div>
                  <p className="text-xs text-slate-500">{integration.desc}</p>
                </div>
              </div>
              <Button
                variant={integration.connected ? "outline" : "default"}
                size="sm"
                className={integration.connected ? "" : "bg-violet-600 hover:bg-violet-700 text-white"}
                disabled={integration.proOnly && plan === "FREE"}
              >
                {integration.connected ? "Connected" : "Connect"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="text-red-700">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Delete account</p>
            <p className="text-xs text-slate-500">Permanently delete your account and all data. This cannot be undone.</p>
          </div>
          <Button variant="destructive" size="sm">Delete account</Button>
        </CardContent>
      </Card>
    </div>
  );
}
