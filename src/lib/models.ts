import mongoose, { Schema, model, models, type Model } from "mongoose";

// Shared options: timestamps give us createdAt/updatedAt; the toJSON transform
// exposes a string `id` (instead of ObjectId `_id`) and drops `__v`, so API
// responses match the shape the UI already expects.
const baseOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform(_doc: unknown, ret: Record<string, unknown>) {
      ret.id = String(ret._id);
      delete ret._id;
    },
  },
} as const;

// Explicit interfaces so TypeScript knows about every field (Mongoose's schema
// inference omits timestamp fields). `createdAt` is added by `timestamps: true`.

// ---------------- User ----------------
export interface IUser {
  email: string;
  passwordHash: string;
  name?: string;
  credits: number;
  createdAt: Date;
  updatedAt: Date;
}
const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String },
    credits: { type: Number, default: 10 }, // free trial credits on signup
  },
  baseOptions
);

// ---------------- ApiKey ----------------
export interface IApiKey {
  userId: string;
  label: string;
  prefix: string;
  hash: string;
  revoked: boolean;
  lastUsedAt?: Date;
  requests: number;
  createdAt: Date;
  updatedAt: Date;
}
const apiKeySchema = new Schema<IApiKey>(
  {
    userId: { type: String, required: true, index: true },
    label: { type: String, default: "Default" },
    prefix: { type: String, required: true }, // first 12 chars, shown in UI
    hash: { type: String, required: true, unique: true }, // sha256 of full key
    revoked: { type: Boolean, default: false },
    lastUsedAt: { type: Date },
    requests: { type: Number, default: 0 },
  },
  baseOptions
);

// ---------------- IndexJob ----------------
export interface IIndexJob {
  userId: string;
  source: string;
  engine: string;
  total: number;
  submitted: number;
  indexed: number;
  failed: number;
  duplicates: number;
  invalid: number;
  creditsSpent: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
const indexJobSchema = new Schema<IIndexJob>(
  {
    userId: { type: String, required: true, index: true },
    source: { type: String, default: "paste" }, // paste | csv | api
    engine: { type: String, default: "indexnow" }, // indexnow | google | both
    total: { type: Number, default: 0 },
    submitted: { type: Number, default: 0 },
    indexed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    invalid: { type: Number, default: 0 },
    creditsSpent: { type: Number, default: 0 },
    status: { type: String, default: "processing" }, // processing | done | error
  },
  baseOptions
);

// ---------------- IndexUrl ----------------
export interface IIndexUrl {
  jobId: string;
  url: string;
  status: string;
  engine: string;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}
const indexUrlSchema = new Schema<IIndexUrl>(
  {
    jobId: { type: String, required: true, index: true },
    url: { type: String, required: true },
    // pending | submitted | indexed | failed | duplicate | invalid
    status: { type: String, default: "pending" },
    engine: { type: String, default: "indexnow" },
    message: { type: String },
  },
  baseOptions
);

// ---------------- CreditTransaction ----------------
export interface ICreditTransaction {
  userId: string;
  amount: number;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}
const creditTransactionSchema = new Schema<ICreditTransaction>(
  {
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true }, // + granted/purchased, - spent
    reason: { type: String, required: true }, // signup_bonus | purchase | indexing | refund
  },
  baseOptions
);

// ---------------- Payment ----------------
export interface IPayment {
  userId: string;
  plan: string;
  amountPaise: number;
  credits: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
const paymentSchema = new Schema<IPayment>(
  {
    userId: { type: String, required: true, index: true },
    plan: { type: String, required: true }, // starter | professional | enterprise
    amountPaise: { type: Number, required: true },
    credits: { type: Number, required: true },
    // unique but sparse: dev-granted payments have no order id (multiple nulls ok)
    razorpayOrderId: { type: String, unique: true, sparse: true },
    razorpayPaymentId: { type: String },
    status: { type: String, default: "created" }, // created | paid | failed
  },
  baseOptions
);

// `models.X || model(...)` guards against "Cannot overwrite model" errors when
// modules are re-evaluated during dev hot-reload.
export const User: Model<IUser> =
  (models.User as Model<IUser>) || model<IUser>("User", userSchema);
export const ApiKey: Model<IApiKey> =
  (models.ApiKey as Model<IApiKey>) || model<IApiKey>("ApiKey", apiKeySchema);
export const IndexJob: Model<IIndexJob> =
  (models.IndexJob as Model<IIndexJob>) || model<IIndexJob>("IndexJob", indexJobSchema);
export const IndexUrl: Model<IIndexUrl> =
  (models.IndexUrl as Model<IIndexUrl>) || model<IIndexUrl>("IndexUrl", indexUrlSchema);
export const CreditTransaction: Model<ICreditTransaction> =
  (models.CreditTransaction as Model<ICreditTransaction>) ||
  model<ICreditTransaction>("CreditTransaction", creditTransactionSchema);
export const Payment: Model<IPayment> =
  (models.Payment as Model<IPayment>) || model<IPayment>("Payment", paymentSchema);

export const isValidId = (id: string) => mongoose.isValidObjectId(id);
