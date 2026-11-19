import { Schema, model, models, type Model } from 'mongoose';
import { modelOn, type DbHandle } from '@/database/request-connection';

// One option chain per underlying per trading day, as of the close. A closed day never changes,
// so a stored chain is served forever and Databento is asked once per ticker per day.
export interface IOptionChain {
    symbol: string;
    day: string; // YYYY-MM-DD (New York trading day)
    asOf: string; // ISO time of the snapshot (the close)
    quotes: { symbol: string; expiry: string; right: 'call' | 'put'; strike: number; bid: number; ask: number; bidSize: number; askSize: number }[];
    createdAt: Date;
}

const OptionChainSchema = new Schema<IOptionChain>({
    symbol: { type: String, required: true },
    day: { type: String, required: true },
    asOf: { type: String, required: true },
    quotes: { type: Schema.Types.Mixed, default: [] }, // one array, not subdocuments (thousands of rows)
}, { timestamps: true });
OptionChainSchema.index({ symbol: 1, day: -1 }, { unique: true });
// Old chains are kept 45 days (enough for any "last close" walk-back), then expire.
OptionChainSchema.index({ createdAt: 1 }, { expireAfterSeconds: 45 * 86400 });

const compiled: Model<IOptionChain> = (models?.OptionChain as Model<IOptionChain>) || model<IOptionChain>('OptionChain', OptionChainSchema);
export const optionChainModel = (db: DbHandle) => modelOn(db, 'OptionChain', OptionChainSchema, compiled);
