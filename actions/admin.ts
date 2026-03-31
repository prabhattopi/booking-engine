// src/actions/admin.ts
"use server";

import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { unstable_noStore as noStore } from "next/cache";

// 1. Fetch all active activity for the dashboard
export async function getActiveBookings() {
  noStore(); // Never cache the admin dashboard!
  
  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { status: "CONFIRMED" },
        { status: "PENDING", lockedUntil: { gt: new Date() } }
      ]
    },
    include: {
      room: true, // Pull in the room details (name, price)
    },
    orderBy: { lockedUntil: 'desc' }
  });

  return bookings;
}

// 2. God Mode: Force Release a Pending Hold
export async function forceReleaseBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  
  if (!booking || booking.status !== "PENDING") {
    return { error: "Booking is not in a pending state." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "EXPIRED", lockedUntil: new Date() } // Expire it instantly
  });

  // 🚀 Blast the unlock command to all users!
  await redis.publish('room_updates', JSON.stringify({ roomId: booking.roomId, status: 'AVAILABLE' }));
  
  return { success: true };
}

// 3. God Mode: Cancel a Confirmed Booking
export async function cancelBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  
  if (!booking || booking.status !== "CONFIRMED") {
    return { error: "Booking is not confirmed." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" } 
  });

  // 🚀 Blast the unlock command to all users!
  await redis.publish('room_updates', JSON.stringify({ roomId: booking.roomId, status: 'AVAILABLE' }));
  
  return { success: true };
}

export async function getAdminRooms() {
    noStore();
    const rooms = await prisma.room.findMany({
      include: {
        bookings: {
          where: {
            OR: [
              { status: "CONFIRMED" },
              { status: "PENDING", lockedUntil: { gt: new Date() } }
            ]
          }
        }
      }
    });
  
    return rooms.map(room => ({
      id: room.id,
      name: room.name,
      price: room.price,
      currentStatus: room.bookings.length > 0 ? room.bookings[0].status : "AVAILABLE"
    }));
  }