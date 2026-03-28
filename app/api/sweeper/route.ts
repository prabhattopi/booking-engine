// src/app/api/sweeper/route.ts
import { prisma } from "@/lib/prisma";
import { emitter } from "@/lib/events";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  // Find all locks that have expired but are still stuck in PENDING
  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: "PENDING",
      lockedUntil: { lte: new Date() } // lockedUntil is Less Than or Equal to NOW
    }
  });

  // Release them all
  for (const booking of expiredBookings) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "EXPIRED" }
    });
    
    // Broadcast to SSE so UI updates instantly
    emitter.emit("room_status_changed", { roomId: booking.roomId, status: "AVAILABLE" });
  }

  return NextResponse.json({ clearedCount: expiredBookings.length });
}