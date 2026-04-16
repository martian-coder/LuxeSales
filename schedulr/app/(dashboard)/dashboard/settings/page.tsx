import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProfileSettings } from "@/components/dashboard/profile-settings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account and preferences.</p>
      </div>
      <ProfileSettings
        userId={user.id}
        initialName={user.name ?? ""}
        initialBio={user.bio ?? ""}
        initialUsername={user.username ?? ""}
        initialTimeZone={user.timeZone}
        email={user.email ?? ""}
        plan={user.plan}
      />
    </div>
  );
}
