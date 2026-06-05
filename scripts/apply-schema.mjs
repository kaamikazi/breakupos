import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))
const schema = readFileSync(join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8')
const password = 'J/M-PdiEGF3g@i8'
const ref = 'uravhwmzfjfhmoqlniau'

const regions = [
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
  'us-east-1', 'us-east-2', 'eu-west-1', 'eu-central-1',
  'us-west-1', 'us-west-2', 'eu-west-2', 'eu-north-1',
  'ap-south-1', 'ca-central-1', 'sa-east-1',
]

const configs = []
for (const region of regions) {
  for (const port of [5432, 6543]) {
    configs.push({
      host: `aws-0-${region}.pooler.supabase.com`,
      port,
      user: `postgres.${ref}`,
      label: `${region}:${port}`,
    })
  }
}

for (const config of configs) {
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    database: 'postgres',
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  })
  try {
    await client.connect()
    console.log(`✓ Connected via ${config.label}. Applying schema...`)
    await client.query(schema)
    await client.end()
    console.log('✓ Schema applied successfully!')
    process.exit(0)
  } catch (err) {
    const msg = err instanceof Error ? err.message.split('\n')[0].slice(0, 90) : String(err)
    // Only log unexpected errors (not "tenant not found" noise)
    if (!msg.includes('not found') && !msg.includes('ENOIDENTIFIER') && !msg.includes('ENOTFOUND')) {
      console.log(`! ${config.label}: ${msg}`)
    }
    try { await client.end() } catch {}
  }
}

console.error('All pooler regions failed. Try the Supabase SQL editor instead.')
process.exit(1)
