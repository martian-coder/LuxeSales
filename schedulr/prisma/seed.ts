import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const db = new PrismaClient({ adapter });

async function main() {
  // Create demo user
  const demo = await db.user.upsert({
    where: { email: "demo@schedulr.app" },
    update: {},
    create: {
      name: "Alex Johnson",
      email: "demo@schedulr.app",
      username: "alex",
      bio: "30 years helping leaders unlock their potential. Executive coach, speaker, and mentor. Let's build your next breakthrough.",
      timeZone: "America/New_York",
      plan: "PRO",
      availability: {
        create: {
          name: "Working Hours",
          isDefault: true,
          schedule: [
            { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
            { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
            { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
            { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
            { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
          ],
          dateOverrides: [],
        },
      },
      eventTypes: {
        create: [
          {
            title: "Discovery Call",
            slug: "discovery-call",
            description:
              "A free 30-minute call to see if we're a good fit. No commitment, just a conversation.",
            length: 30,
            locationType: "ONLINE",
            price: 0,
            paymentRequired: false,
            bookingWindowDays: 60,
            minimumBookingNotice: 60,
          },
          {
            title: "Strategy Session",
            slug: "strategy-session",
            description:
              "Deep dive into your goals and challenges. Walk away with a clear action plan.",
            length: 60,
            locationType: "ZOOM",
            price: 15000, // $150.00
            paymentRequired: true,
            currency: "usd",
            bookingWindowDays: 60,
            minimumBookingNotice: 120,
            beforeEventBuffer: 15,
            afterEventBuffer: 15,
          },
          {
            title: "VIP Intensive Day",
            slug: "vip-day",
            description:
              "Full-day intensive coaching session. Transform your business strategy in one day.",
            length: 240,
            locationType: "IN_PERSON",
            price: 80000, // $800.00
            paymentRequired: true,
            currency: "usd",
            requiresConfirmation: true,
            bookingWindowDays: 90,
            minimumBookingNotice: 4320, // 3 days
          },
        ],
      },
    },
  });

  console.log(`✅ Demo user created: ${demo.email}`);
  console.log(`   Booking page: http://localhost:3000/u/alex`);
  console.log(`\n🔑 To log in, use any email/password (auth is credential-only in dev).`);
  console.log(`   Or register a new account at http://localhost:3000/register`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
