import pg from 'pg'
const { Client } = pg
const ref = 'uravhwmzfjfhmoqlniau'
const password = 'J/M-PdiEGF3g@i8'

for (const cfg of [
  { host: 'aws-0-ap-southeast-1.pooler.supabase.com', port: 5432, user: `postgres.${ref}` },
  { host: 'aws-0-us-east-1.pooler.supabase.com', port: 5432, user: `postgres.${ref}` },
]) {
  const c = new Client({ ...cfg, database: 'postgres', password, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 })
  try {
    await c.connect()
    const r = await c.query('SELECT version()')
    console.log('CONNECTED:', r.rows[0].version.slice(0,60))
    await c.end()
    process.exit(0)
  } catch (e) {
    console.log(`FAIL ${cfg.host}:${cfg.port}`)
    console.log(`  code=${e.code}  msg=${e.message.split('\n')[0].slice(0,120)}`)
    try { await c.end() } catch {}
  }
}
