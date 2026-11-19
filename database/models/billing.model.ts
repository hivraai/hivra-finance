import { Schema, model, models, type Model } from 'mongoose';
import { modelOn, type DbHandle } from '@/database/request-connection';

// One row per user: their Stripe customer, current plan and bought AI credits. Written only by the
// Stripe webhook (and by checkout, which creates the customer); never by the browser.
export interface IBilling {
    userId: string;
    email: string;
    stripeCustomerId?: string;
    subscriptionId?: string;
    plan: 'free' | 'pro' | 'elite';
    status?: string; // Stripe subscription status
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    bonusCredits: number; // bought top-up credits; never expire, spent after the monthly allowance
    creditedSessions: string[]; // checkout sessions already credited (webhook retries are no-ops)
}

const BillingSchema = new Schema<IBilling>({
    userId: { type: String, required: true },
    email: { type: String, default: '' },
    stripeCustomerId: { type: String },
    subscriptionId: { type: String },
    plan: { type: String, enum: ['free', 'pro', 'elite'], default: 'free' },
    status: { type: String },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    bonusCredits: { type: Number, default: 0 },
    creditedSessions: { type: [String], default: [] },
}, { timestamps: true });
BillingSchema.index({ userId: 1 }, { unique: true });
BillingSchema.index({ stripeCustomerId: 1 }, { sparse: true });

const compiled: Model<IBilling> = (models?.Billing as Model<IBilling>) || model<IBilling>('Billing', BillingSchema);
export const billingModel = (db: DbHandle) => modelOn(db, 'Billing', BillingSchema, compiled);
