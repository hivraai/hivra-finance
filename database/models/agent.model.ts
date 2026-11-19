import { Schema, model, models, type Model } from 'mongoose';
import { modelOn, type DbHandle } from '@/database/request-connection';

// One conversation with the AI agent. `messages` is the Messages API history exactly as sent and
// received (thinking blocks included): the API rejects a history whose earlier turns were edited.
export interface IAgentThread {
    _id: unknown;
    userId: string;
    title: string;
    symbol?: string;
    messages: unknown[];
    creditsUsed: number;
    createdAt: Date;
    updatedAt: Date;
}

const AgentThreadSchema = new Schema<IAgentThread>({
    userId: { type: String, required: true, index: true },
    title: { type: String, default: 'New conversation' },
    symbol: { type: String },
    messages: { type: [Schema.Types.Mixed], default: [] },
    creditsUsed: { type: Number, default: 0 },
}, { timestamps: true });
AgentThreadSchema.index({ userId: 1, updatedAt: -1 });

// Credits used per user per calendar month (UTC). 1,000 credits = US$1, billed at API cost × 5.
export interface IAiUsage {
    userId: string;
    month: string; // YYYY-MM
    credits: number;
    costUsd: number;
    requests: number;
    inputTokens: number;
    outputTokens: number;
}

const AiUsageSchema = new Schema<IAiUsage>({
    userId: { type: String, required: true },
    month: { type: String, required: true },
    credits: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
    requests: { type: Number, default: 0 },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
}, { timestamps: true });
AiUsageSchema.index({ userId: 1, month: 1 }, { unique: true });

const compiledThread: Model<IAgentThread> = (models?.AgentThread as Model<IAgentThread>) || model<IAgentThread>('AgentThread', AgentThreadSchema);
const compiledUsage: Model<IAiUsage> = (models?.AiUsage as Model<IAiUsage>) || model<IAiUsage>('AiUsage', AiUsageSchema);

export const agentThreadModel = (db: DbHandle) => modelOn(db, 'AgentThread', AgentThreadSchema, compiledThread);
export const aiUsageModel = (db: DbHandle) => modelOn(db, 'AiUsage', AiUsageSchema, compiledUsage);
