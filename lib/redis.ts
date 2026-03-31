// src/lib/redis.ts
import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Connect to Upstash Redis using the connection string
export const redis = globalForRedis.redis ?? new Redis(process.env.UPSTASH_REDIS_URL as string);

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;