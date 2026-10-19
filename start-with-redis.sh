#!/bin/bash

# Kill any existing Redis processes to avoid conflicts
pkill -9 redis-server 2>/dev/null || true

# Start Redis in the background without daemonize
echo "🚀 Starting Redis server..."
redis-server --port 6379 --bind 127.0.0.1 --protected-mode no --save "" --appendonly no > /tmp/redis.log 2>&1 &
REDIS_PID=$!

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
for i in {1..15}; do
  if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready on port 6379!"
    break
  fi
  if [ $i -eq 15 ]; then
    echo "⚠️  Warning: Redis failed to start after 15 seconds, app will use in-memory fallback"
    echo "📋 Redis log:"
    cat /tmp/redis.log 2>/dev/null || echo "No log available"
  fi
  sleep 1
done

# Start the main application
echo "🚀 Starting DoorSurvey Pro application..."
NODE_ENV=development tsx server/index.ts
