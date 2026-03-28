// src/lib/events.ts
import { EventEmitter } from 'events';

const globalForEvents = globalThis as unknown as {
  emitter: EventEmitter | undefined;
};

// Create a single, globally shared event emitter
export const emitter = globalForEvents.emitter ?? new EventEmitter();

if (process.env.NODE_ENV !== 'production') globalForEvents.emitter = emitter;