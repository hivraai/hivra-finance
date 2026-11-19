import { Schema, model, models, type Model } from 'mongoose';
import { modelOn, type DbHandle } from '@/database/request-connection';

// Databento spend, one document per UTC day: calls and US$ (priced with Databento's free
// metadata.get_cost) in total and per kind (chain, bars, backtest, prewarm …). Read by the daily cap
// in lib/databento.ts and by scripts/databento-usage.mjs.
export interface IDatabentoUsage {
    day: string; // YYYY-MM-DD, UTC
    calls: number;
    usd: number;
    kinds: Record<string, { calls: number; usd: number }>;
}

const DatabentoUsageSchema = new Schema<IDatabentoUsage>({
    day: { type: String, required: true, unique: true },
    calls: { type: Number, default: 0 },
    usd: { type: Number, default: 0 },
    kinds: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, minimize: false });

const compiled: Model<IDatabentoUsage> = (models?.DatabentoUsage as Model<IDatabentoUsage>) || model<IDatabentoUsage>('DatabentoUsage', DatabentoUsageSchema);
export const databentoUsageModel = (db: DbHandle) => modelOn(db, 'DatabentoUsage', DatabentoUsageSchema, compiled);
