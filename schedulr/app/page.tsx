import Link from "next/link";
import {
  Calendar,
  Zap,
  CreditCard,
  Users,
  Clock,
  Bell,
  Globe,
  ChevronRight,
  Check,
  Star,
  ArrowRight,
  Layout,
  Bot,
  Package,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: Bot,
    title: "AI Scheduling Assistant",
    description:
      "Smart availability suggestions, meeting briefs, and conflict detection powered by AI.",
    color: "violet",
  },
  {
    icon: CreditCard,
    title: "Built-in Payments",
    description:
      "Charge for your time with Stripe. No plugins or workarounds — payments are first-class.",
    color: "emerald",
  },
  {
    icon: Package,
    title: "Session Bundles",
    description:
      "Sell 5-session or 10-session packs. Clients buy upfront, book as they need.",
    color: "blue",
  },
  {
    icon: ListChecks,
    title: "Smart Waitlists",
    description:
      "When a slot opens, the next person on the waitlist is auto-notified instantly.",
    color: "amber",
  },
  {
    icon: Layout,
    title: "Custom Intake Forms",
    description:
      "Collect exactly what you need before the meeting with conditional logic fields.",
    color: "rose",
  },
  {
    icon: Users,
    title: "Team Scheduling",
    description:
      "Round-robin, collective, and managed event types for any team size.",
    color: "indigo",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description:
      "Email & SMS reminders with custom timing. No-show protection with card holds.",
    color: "cyan",
  },
  {
    icon: Globe,
    title: "Calendar Sync",
    description:
      "Two-way sync with Google Calendar and Outlook. Always accurate, never double-booked.",
    color: "violet",
  },
];

const PLANS = [
  {
    name: "Free",
    price: 0,
    description: "Perfect for getting started",
    features: [
      "1 event type",
      "Unlimited bookings",
      "Email confirmations",
      "Public booking page",
      "Google Calendar sync",
    ],
    cta: "Start for free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: 15,
    description: "Everything you need to grow",
    features: [
      "Unlimited event types",
      "Built-in Stripe payments",
      "Session bundles",
      "Waitlists",
      "Custom intake forms",
      "SMS reminders",
      "Custom branding",
      "Zoom & Meet integration",
      "Webhooks & API access",
    ],
    cta: "Start 14-day free trial",
    highlighted: true,
  },
  {
    name: "Teams",
    price: 25,
    description: "For teams that scale",
    features: [
      "Everything in Pro",
      "Round-robin scheduling",
      "Collective events",
      "Team analytics",
      "Managed event types",
      "Priority support",
      "SSO / SAML (coming soon)",
    ],
    cta: "Start free trial",
    highlighted: false,
    suffix: "/seat",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Schedulr replaced Calendly and Stripe for me. I now collect payments at booking — no chasing invoices.",
    author: "Sarah Chen",
    role: "Executive Coach",
    stars: 5,
  },
  {
    quote:
      "The waitlist feature alone saved me hours of back-and-forth. When someone cancels, the next person books automatically.",
    author: "Marcus Rivera",
    role: "Personal Trainer",
    stars: 5,
  },
  {
    quote:
      "Finally a Cal.com alternative that just works. Setup took 5 minutes and my booking page looks incredible.",
    author: "Priya Nair",
    role: "Consultant",
    stars: 5,
  },
];

const ICON_COLORS: Record<string, string> = {
  violet: "bg-violet-100 text-violet-600",
  emerald: "bg-emerald-100 text-emerald-600",
  blue: "bg-blue-100 text-blue-600",
  amber: "bg-amber-100 text-amber-600",
  rose: "bg-rose-100 text-rose-600",
  indigo: "bg-indigo-100 text-indigo-600",
  cyan: "bg-cyan-100 text-cyan-600",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span>Schedulr</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-slate-900 transition-colors">Reviews</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-full px-4 py-1.5 text-sm text-violet-700 font-medium mb-8">
            <Zap className="w-3.5 h-3.5" />
            The Cal.com alternative with AI + payments built-in
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
            Scheduling that{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
              actually works
            </span>{" "}
            for you
          </h1>

          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Share your booking link. Get paid. Auto-fill your calendar. Schedulr handles the chaos so you can focus on what you do best.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link href="/register">
              <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white px-8">
                Start for free — no card needed
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/demo/alex">
              <Button size="lg" variant="outline" className="px-8">
                See a live demo
              </Button>
            </Link>
          </div>
          <p className="text-sm text-slate-400">Free forever for solo users · No credit card required</p>
        </div>

        {/* Hero mockup */}
        <div className="max-w-5xl mx-auto mt-16">
          <div className="relative rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden bg-slate-50">
            <div className="flex items-center gap-1.5 px-4 py-3 bg-white border-b border-slate-100">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs text-slate-400 font-mono">schedulr.app/alex</span>
            </div>
            <div className="grid md:grid-cols-2 gap-0">
              <div className="bg-white p-8 border-r border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">A</div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Alex Johnson</h3>
                    <p className="text-sm text-slate-500">Executive Coach · San Francisco</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-6">30 years helping leaders unlock their potential. Book a session and let&apos;s build your next breakthrough.</p>
                <div className="space-y-3">
                  {[
                    { label: "Discovery Call", duration: "30 min", price: "Free" },
                    { label: "Strategy Session", duration: "60 min", price: "$150" },
                    { label: "VIP Day", duration: "4 hrs", price: "$800" },
                  ].map((event) => (
                    <div key={event.label} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-violet-200 hover:bg-violet-50/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{event.label}</p>
                          <p className="text-xs text-slate-500">{event.duration}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{event.price}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 p-8">
                <p className="text-sm font-medium text-slate-700 mb-4">Select a date in June 2026</p>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-2">
                  {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => <span key={d}>{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 30 }, (_, i) => {
                    const num = i + 1;
                    const isAvailable = [2,3,5,9,10,12,16,17,19,23,24].includes(num);
                    const isSelected = num === 16;
                    return (
                      <div key={i} className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium ${isSelected ? "bg-violet-600 text-white" : isAvailable ? "bg-white border border-slate-200 text-slate-900 cursor-pointer" : "text-slate-300"}`}>
                        {num}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-slate-700">Available times</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["9:00 AM","10:30 AM","2:00 PM","3:30 PM","4:00 PM","5:00 PM"].map((t, i) => (
                      <button key={t} className={`text-xs py-1.5 rounded-md border font-medium transition-colors ${i === 2 ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 text-slate-700 hover:border-violet-300"}`}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof Bar ── */}
      <section className="border-y border-slate-100 bg-slate-50 py-5">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
          <span className="font-semibold text-slate-900">Trusted by 10,000+ professionals:</span>
          {["Coaches","Consultants","Therapists","Tutors","Designers","Lawyers"].map((r) => (
            <span key={r}>{r}</span>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Everything Cal.com should have been</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">We studied thousands of feature requests and built what users actually need.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-violet-200 hover:shadow-lg hover:shadow-violet-50/50 transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${ICON_COLORS[feature.color]}`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Why switch to Schedulr?</h2>
            <p className="text-slate-500">The features Cal.com users have been requesting for years.</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
              <div className="p-4 text-sm font-semibold text-slate-600">Feature</div>
              <div className="p-4 text-center text-sm font-semibold text-slate-400">Cal.com</div>
              <div className="p-4 text-center text-sm font-semibold text-violet-600">Schedulr</div>
            </div>
            {[
              ["Built-in payments", "✕", "✓"],
              ["Session bundle packages", "✕", "✓"],
              ["Smart waitlists", "✕", "✓"],
              ["AI scheduling assistant", "✕", "✓"],
              ["Manual booking override", "✕", "✓"],
              ["Jump to first available slot", "✕", "✓"],
              ["Conditional intake forms", "Pro only", "✓"],
              ["No-show protection", "✕", "✓"],
              ["Zero-config deployment", "✕", "✓"],
            ].map(([feature, cal, sch], i) => (
              <div key={feature} className={`grid grid-cols-3 border-b border-slate-100 last:border-0 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                <div className="p-4 text-sm text-slate-700">{feature}</div>
                <div className={`p-4 text-center text-sm ${cal === "✕" ? "text-slate-300" : "text-slate-500"}`}>{cal}</div>
                <div className={`p-4 text-center text-sm font-bold ${sch === "✓" ? "text-violet-600" : "text-slate-500"}`}>{sch}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Loved by professionals</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.author}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-slate-500">Start free. Upgrade when you&apos;re ready. No surprises.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`relative p-8 rounded-2xl border ${plan.highlighted ? "border-violet-600 bg-violet-600 text-white shadow-2xl shadow-violet-200" : "border-slate-200 bg-white"}`}>
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-400 text-amber-900 border-0">Most popular</Badge>
                  </div>
                )}
                <h3 className={`text-lg font-bold mb-1 ${plan.highlighted ? "text-white" : "text-slate-900"}`}>{plan.name}</h3>
                <p className={`text-sm mb-6 ${plan.highlighted ? "text-violet-200" : "text-slate-500"}`}>{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-bold ${plan.highlighted ? "text-white" : "text-slate-900"}`}>${plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? "text-violet-200" : "text-slate-500"}`}>/mo{plan.suffix ?? ""}</span>
                </div>
                <Link href="/register">
                  <Button className={`w-full mb-8 ${plan.highlighted ? "bg-white text-violet-600 hover:bg-violet-50" : ""}`} variant={plan.highlighted ? "secondary" : "outline"}>
                    {plan.cta}
                  </Button>
                </Link>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.highlighted ? "text-violet-200" : "text-violet-600"}`} />
                      <span className={plan.highlighted ? "text-violet-100" : "text-slate-600"}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Start scheduling smarter today
          </h2>
          <p className="text-xl text-slate-500 mb-10">
            Join 10,000+ professionals who&apos;ve replaced Calendly and Cal.com with Schedulr.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white px-10">
              Create your free account
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 py-12 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <div className="w-6 h-6 bg-violet-600 rounded flex items-center justify-center">
              <Calendar className="w-3 h-3 text-white" />
            </div>
            Schedulr
          </div>
          <p className="text-sm text-slate-500">© 2026 Schedulr. Built better than the competition.</p>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Blog</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
