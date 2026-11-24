const fs = require("fs/promises");
const path = require("path");
const pool = require("../config/db");

const migrationsDirectory = path.join(__dirname, "migrations");

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["glowcart:migrations"]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationFiles = (await fs.readdir(migrationsDirectory))
      .filter((file) => /^\d+_[a-z0-9_]+\.sql$/i.test(file))
      .sort();

    if (migrationFiles.length === 0) {
      throw new Error("No database migration files were found.");
    }

    for (const file of migrationFiles) {
      const version = path.basename(file, ".sql");
      const applied = await client.query(
        "SELECT 1 FROM public.schema_migrations WHERE version = $1",
        [version],
      );

      if (applied.rowCount > 0) {
        console.log(`Database migration ${version} is already applied.`);
        continue;
      }

      const migration = await fs.readFile(path.join(migrationsDirectory, file), "utf8");
      await client.query(migration);
      await client.query(
        "INSERT INTO public.schema_migrations (version) VALUES ($1)",
        [version],
      );
      console.log(`Applied database migration ${version}.`);
    }

    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Database migration rollback failed.", rollbackError.code || "unknown");
    }
    console.error("Database migration failed.", error.code || error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(async (error) => {
  console.error("Unable to run database migration.", error.code || error.message);
  process.exitCode = 1;
  await pool.end();
});
