#!/usr/bin/env node

/**
 * Run a command with the detected package manager
 * Usage: node scripts/run-with-pm.js <command>
 */

const { execSync } = require("child_process");

function detectPackageManager() {
  try {
    execSync("bun --version", { stdio: "ignore" });
    return "bun";
  } catch {
    try {
      execSync("pnpm --version", { stdio: "ignore" });
      return "pnpm";
    } catch {
      return "npm";
    }
  }
}

const pm = detectPackageManager();
const command = process.argv.slice(2).join(" ");

if (!command) {
  console.error("Error: No command provided");
  process.exit(1);
}

try {
  execSync(`${pm} ${command}`, { stdio: "inherit" });
} catch (error) {
  process.exit(error.status || 1);
}
