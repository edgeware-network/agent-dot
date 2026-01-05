#!/usr/bin/env node

/**
 * Run a command with the detected package manager
 * Usage: node scripts/run-with-pm.js <command>
 */

const { execSync, execFileSync } = require("child_process");

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
const argv = process.argv.slice(2);

if (argv.length === 0) {
  console.error("Error: No command provided");
  process.exit(1);
}

const subcommand = argv[0];
const args = argv.slice(1);

try {
  execFileSync(pm, [subcommand, ...args], { stdio: "inherit" });
} catch (error) {
  process.exit(error.status || 1);
}
