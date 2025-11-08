#!/bin/sh

# Detect which package manager to use
# Checks in order: bun, pnpm, npm

if command -v bun >/dev/null 2>&1; then
  echo "bun"
elif command -v pnpm >/dev/null 2>&1; then
  echo "pnpm"
elif command -v npm >/dev/null 2>&1; then
  echo "npm"
else
  echo "npm" # fallback
fi

