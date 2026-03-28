// src/app/api/stream/route.ts
import { emitter } from '@/lib/events';

export const dynamic = 'force-dynamic'; // Prevent Next.js from caching this route

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // 1. Define what happens when a message is heard
      const sendUpdate = (data: { roomId: string, status: string }) => {
        // SSE requires this specific format: "data: {JSON}\n\n"
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      // 2. Listen to the global event bus
      emitter.on('room_status_changed', sendUpdate);

      // 3. Optional: Send an initial heartbeat so the connection doesn't drop
      controller.enqueue(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);

      // 4. Cleanup memory if the user closes their browser
      const cleanup = () => {
        emitter.off('room_status_changed', sendUpdate);
      };
      
      // We check for connection aborts
      // In a real production app you'd attach this to req.signal
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}