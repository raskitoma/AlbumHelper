#!/bin/sh
set -e

# Run Prisma schema push (to initialize the DB file if it doesn't exist)
echo "Running Prisma db push..."
npx prisma db push --accept-data-loss

# Run the seed script to populate catalog data
echo "Running database seed..."
npx prisma db seed

# Start the application
echo "Starting Next.js application..."
exec npm run start
