// src/actions/booking.ts
"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { emitter } from "@/lib/events";

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

  // Shout to the event bus that this room is now locked
  emitter.emit('room_status_changed', { roomId: roomId, status: 'LOCKED' });

  redirect(`/checkout/${booking.id}`);
}

// 2. Payment Processing & Smart Grace Period
export async function processPayment(bookingId: string, cvv: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  
  if (!booking || booking.status !== "PENDING") {
    return { error: "Invalid or expired session." };
  }

  const now = new Date();

  // Check if their timer ran out before they even clicked pay
  if (now > booking.lockedUntil) {
    await expireBooking(bookingId);
    return { error: "Your reservation time expired. The room has been released." };
  }

  // THE SIMULATION: Failed Payment (Strict Retry Window)
  if (cvv === "999") {
    // Truncate the hold time. Give them exactly 2 minutes from right NOW.
    const twoMinutesMs = 2 * 60 * 1000;
    const strictRetryTime = new Date(now.getTime() + twoMinutesMs);
    
    await prisma.booking.update({
      where: { id: bookingId },
      data: { lockedUntil: strictRetryTime }
    });

    return { 
      error: "Payment declined. We've adjusted your hold to 2:00 minutes so you can try a different card.",
      newLockedUntil: strictRetryTime // Sent to frontend to update the clock
    };
  }

  // SUCCESS! Confirm the booking.
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED" }
  });
  
  emitter.emit("room_status_changed", { roomId: booking.roomId, status: "BOOKED" });
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
    emitter.emit("room_status_changed", { roomId: booking.roomId, status: "AVAILABLE" });
  }
}