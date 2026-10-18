#!/bin/bash
# Start Redis and the application

echo "🚀 Starting Redis server..."
redis-server --daemonize yes --port 6379 --bind 127.0.0.1 --protected-mode yes --maxmemory 256mb --maxmemory-policy allkeys-lru

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
timeout=5
while [ $timeout -gt 0 ]; do
  if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
    break
  fi
  sleep 1
  timeout=$((timeout - 1))
done

if [ $timeout -eq 0 ]; then
  echo "⚠️  Warning: Redis did not start in time, application will use in-memory cache"
fi

echo "🚀 Starting application..."
npm run dev
