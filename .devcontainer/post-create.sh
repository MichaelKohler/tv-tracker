#!/bin/bash
set -e

echo "Running post-create script..."

# Create .env file
if [ ! -f ".env" ]; then
  echo "Creating .env file..."
  cp .env.example .env
fi

# Install dependencies
echo "Installing npm dependencies..."
npm ci

# Install Playwright browsers
echo "Installing Playwright browsers..."
npx playwright install --with-deps

echo "Post-create script finished."
