const { Schema, model, Types } = require('mongoose');

const CounterSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, default: 'Radha Jaap' },
    total: { type: Number, default: 0 },
    daily: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    goalPerDay: { type: Number, default: 108 },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

CounterSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = model('Counter', CounterSchema);
