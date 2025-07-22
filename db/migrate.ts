import { env } from "@/lib/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import pino from "pino";
import postgres from "postgres";
const logger = pino({ transport: { target: "pino-pretty" } });

const runMigrate = async () => {
  if (!env.DATABASE_URI) {
    throw new Error("DATABASE_URI is not defined");
  }

  const connection = postgres(env.DATABASE_URI, { max: 1 });

  const db = drizzle(connection, { logger: true });

  logger.info("Running migrations...");

  const start = Date.now();

  await migrate(db, { migrationsFolder: "db/migrations" });

  const end = Date.now();

  logger.info("Migrations completed in %dms", end - start);
  process.exit(0);
};

runMigrate().catch((err: unknown) => {
  const error = err as Error;
  logger.error("❌ Migration failed");
  logger.error(error.message);
  process.exit(1);
});
