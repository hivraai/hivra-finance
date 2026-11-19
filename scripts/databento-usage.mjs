// Databento spend per day from the DatabentoUsage ledger (lib/databento.ts prices every request with
// the free metadata.get_cost). Usage: node scripts/databento-usage.mjs [days=14]
import { config } from 'dotenv';
import mongoose from 'mongoose';

config({ path: '.env.local' });
const days = Number(process.argv[2]) || 14;
const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI is not set'); process.exit(1); }

await mongoose.connect(uri);
const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
const rows = await mongoose.connection.collection('databentousages').find({ day: { $gte: since } }).sort({ day: -1 }).toArray();
const cap = Number(process.env.DATABENTO_DAILY_CAP_USD) || 10;
let total = 0;
console.log(`Databento spend, last ${days} days (daily cap $${cap})`);
for (const r of rows) {
    total += r.usd ?? 0;
    const kinds = Object.entries(r.kinds ?? {}).map(([k, v]) => `${k} ${v.calls}×$${(v.usd ?? 0).toFixed(3)}`).join('  ');
    console.log(`${r.day}  $${(r.usd ?? 0).toFixed(3).padStart(8)}  ${String(r.calls).padStart(4)} calls  ${kinds}`);
}
console.log(`Total $${total.toFixed(2)}`);
await mongoose.disconnect();
