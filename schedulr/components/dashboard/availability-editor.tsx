"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DAYS_OF_WEEK } from "@/lib/utils";
import { saveAvailability } from "@/app/actions/availability";
import { Check } from "lucide-react";

type DaySchedule = {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${h < 12 ? "AM" : "PM"}`;
  const value = `${String(h).padStart(2, "0")}:${m}`;
  return { label, value };
});

interface AvailabilityEditorProps {
  availabilityId?: string;
  initialSchedule: DaySchedule[];
  userId: string;
}

export function AvailabilityEditor({
  availabilityId,
  initialSchedule,
  userId,
}: AvailabilityEditorProps) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    DAYS_OF_WEEK.map((_, i) => initialSchedule[i] ?? { dayOfWeek: i, enabled: false, startTime: "09:00", endTime: "17:00" })
  );
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const updateDay = (dayOfWeek: number, updates: Partial<DaySchedule>) => {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...updates } : d))
    );
  };

  const handleSave = () => {
    startTransition(async () => {
      await saveAvailability({
        availabilityId,
        userId,
        schedule: schedule
          .filter((d) => d.enabled)
          .map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {schedule.map((day) => (
            <div key={day.dayOfWeek} className="flex items-center gap-6 py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3 w-36">
                <Switch
                  checked={day.enabled}
                  onCheckedChange={(checked) => updateDay(day.dayOfWeek, { enabled: checked })}
                />
                <span className={`text-sm font-medium ${day.enabled ? "text-slate-900" : "text-slate-400"}`}>
                  {DAYS_OF_WEEK[day.dayOfWeek]}
                </span>
              </div>

              {day.enabled ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={day.startTime}
                    onValueChange={(v) => updateDay(day.dayOfWeek, { startTime: v })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-slate-400 text-sm">–</span>

                  <Select
                    value={day.endTime}
                    onValueChange={(v) => updateDay(day.dayOfWeek, { endTime: v })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <span className="text-sm text-slate-400">Unavailable</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Changes apply to all event types using this schedule.
        </p>
        <Button
          onClick={handleSave}
          loading={isPending}
          className={saved ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"}
        >
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
