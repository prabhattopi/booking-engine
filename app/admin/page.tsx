// src/app/admin/page.tsx
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic"; // Always fetch fresh data on load

export default async function AdminPage() {
  // 1. Fetch all rooms
  const rooms = await prisma.room.findMany({
    orderBy: { name: 'asc' }
  });

  // 2. Figure out the CURRENT status for each room by looking at active bookings
  const roomsWithStatus = await Promise.all(rooms.map(async (room) => {
    const activeBooking = await prisma.booking.findFirst({
      where: {
        roomId: room.id,
        OR: [
          { status: "CONFIRMED" },
          { status: "PENDING", lockedUntil: { gt: new Date() } } // Only count locks that haven't expired
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      id: room.id,
      name: room.name,
      price: room.price,
      currentStatus: activeBooking ? activeBooking.status : "AVAILABLE",
    };
  }));

  return (
    <main className="min-h-screen p-8 md:p-12 max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          Admin Control Center
        </h1>
        <p className="text-slate-400 mt-2">Monitor bookings and inventory locks in real-time.</p>
      </div>

      <DashboardClient initialRooms={roomsWithStatus} />
    </main>
  );
}