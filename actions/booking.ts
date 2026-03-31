// src/actions/booking.ts
"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { redis } from "@/lib/redis";
import { unstable_noStore as noStore } from "next/cache"; // 🛑 THE CACHE KILLER

// 1. Initial Booking Lock
export async function lockRoom(roomId: string) {
  const cookieStore = await cookies();
  let guestId = cookieStore.get("guestSessionId")?.value;
  
  if (!guestId) {
    guestId = crypto.randomUUID();
    cookieStore.set("guestSessionId", guestId);
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return { error: "Room not found" };

  const activeBooking = await prisma.booking.findFirst({
    where: {
      roomId: roomId,
      OR: [
        { status: "CONFIRMED" },
        { status: "PENDING", lockedUntil: { gt: new Date() } }
      ]
    }
  });

  if (activeBooking) {
    return { error: "Sorry, this room is currently locked or sold out." };
  }

  const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  const booking = await prisma.booking.create({
    data: {
      roomId,
      guestSessionId: guestId,
      status: "PENDING",
      lockedUntil,
      priceAtBooking: room.price,
    }
  });

  // 🚀 PUBLISH TO REDIS: Tell all Vercel servers this room is locked
  await redis.publish('room_updates', JSON.stringify({ roomId: roomId, status: 'LOCKED' }));

  redirect(`/checkout/${booking.id}`);
}

// 2. Payment Processing & Smart Grace Period
export async function processPayment(bookingId: string, cvv: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  
  if (!booking || booking.status !== "PENDING") {
    return { error: "Invalid or expired session." };
  }

  const now = new Date();

  if (now > booking.lockedUntil) {
    await expireBooking(bookingId);
    return { error: "Your reservation time expired. The room has been released." };
  }

  if (cvv === "999") {
    const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000);
    
    // The Bug Fix: Only reduce time if they have MORE than 2 mins left!
    if (booking.lockedUntil > twoMinutesFromNow) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { lockedUntil: twoMinutesFromNow }
      });

      return { 
        error: "Payment declined. We've reduced your hold to 2:00 minutes.",
        newLockedUntil: twoMinutesFromNow 
      };
    } else {
      return { error: "Payment declined. Please try a different card quickly!" };
    }
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED" }
  });
  
  // 🚀 PUBLISH TO REDIS: Room is permanently sold
  await redis.publish('room_updates', JSON.stringify({ roomId: booking.roomId, status: 'BOOKED' }));
  return { success: true };
}

// 3. Fallback expiration action
export async function expireBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (booking && booking.status === "PENDING") {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "EXPIRED" }
    });
    // 🚀 PUBLISH TO REDIS: Room is available again
    await redis.publish('room_updates', JSON.stringify({ roomId: booking.roomId, status: 'AVAILABLE' }));
  }
}

// 4. THE CACHE FIX: We added a _timestamp parameter to trick the browser!
export async function checkRoomStatus(roomId: string, _timestamp?: number) {
  noStore(); // 🛑 Tells Vercel NEVER to cache this server response

  const activeBooking = await prisma.booking.findFirst({
    where: {
      roomId: roomId,
      OR: [
        { status: "CONFIRMED" },
        { status: "PENDING", lockedUntil: { gt: new Date() } }
      ]
    }
  });

  if (!activeBooking) return "AVAILABLE";
  return activeBooking.status; // Returns "PENDING" or "CONFIRMED"
}