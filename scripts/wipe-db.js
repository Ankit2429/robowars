import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || '', {
  ssl: { rejectUnauthorized: false }
});

async function dropAll() {
  console.log("Dropping all tables in public schema...");
  await sql`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `;
  console.log("All tables dropped.");
  process.exit(0);
}

dropAll().catch(e => {
  console.error(e);
  process.exit(1);
});
