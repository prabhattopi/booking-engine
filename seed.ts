// seed.ts
import "dotenv/config"; // Ensure it reads your .env file
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// 1. Initialize the adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// 2. Pass it to the client
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.room.createMany({
    data: [
      { name: "Oceanview Suite", description: "A beautiful suite with sea views.", price: 25000, imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80" },
      { name: "Mountain Lodge", description: "Cozy cabin nestled in the pines.", price: 18000, imageUrl: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80" },
      { name: "Urban Penthouse", description: "Modern luxury in the city center.", price: 45000, imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80" }
    ]
  });
  console.log("Database seeded successfully with Neon Postgres!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });