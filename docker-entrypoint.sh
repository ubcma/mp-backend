#!/bin/sh
set -e

echo "Running database migrations (drizzle-kit push)..."
pnpm exec drizzle-kit push

echo "Starting dev server..."
exec pnpm dev
