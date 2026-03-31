// src/app/api/stream/route.ts
import Redis from 'ioredis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      // Create a dedicated Redis connection strictly for listening
      const subscriber = new Redis(process.env.UPSTASH_REDIS_URL as string);

      // Subscribe to the channel
      await subscriber.subscribe('room_updates');

      // When Redis hears a message, push it to the frontend
      subscriber.on('message', (channel, message) => {
        if (channel === 'room_updates') {
          controller.enqueue(`data: ${message}\n\n`);
        }
      });

      controller.enqueue(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);

      // Handle client disconnects to prevent memory leaks
      request.signal.addEventListener('abort', () => {
        subscriber.quit();
      });
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