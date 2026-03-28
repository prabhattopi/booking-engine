// src/app/page.tsx
import { prisma } from "@/lib/prisma";
import RoomCard from "@/components/RoomCard";

export const dynamic = "force-dynamic"; // Ensure it checks the DB fresh on every load

export default async function Home() {
  const rooms = await prisma.room.findMany({
    orderBy: { price: 'asc' }
  });

  // Check the active status of each room before rendering
  const roomsWithAvailability = await Promise.all(rooms.map(async (room) => {
    const activeBooking = await prisma.booking.findFirst({
      where: {
        roomId: room.id,
        OR: [
          { status: "CONFIRMED" },
          { status: "PENDING", lockedUntil: { gt: new Date() } }
        ]
      }
    });

    return {
      ...room,
      // If there is an active booking, it is NOT available
      isAvailable: !activeBooking 
    };
  }));

  return (
    <main className="min-h-screen p-8 md:p-24 max-w-7xl mx-auto">
      <div className="mb-16 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-6">
          Find Your Escape
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Experience world-class luxury and comfort. Book your perfect stay with our real-time availability engine.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {roomsWithAvailability.map((room, index) => (
          <RoomCard 
            key={room.id} 
            room={room} 
            initialAvailable={room.isAvailable} 
            index={index} 
          />
        ))}
      </div>
    </main>
  );
}