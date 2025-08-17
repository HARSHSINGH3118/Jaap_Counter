const { Schema, model, Types } = require('mongoose');

const EventSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    counterId: { type: Types.ObjectId, ref: 'Counter', required: true, index: true },
    opId: { type: String, required: true, unique: true }, // client-generated UUID for idempotency
    type: { type: String, enum: ['inc', 'dec', 'reset', 'setGoal'], required: true },
    value: { type: Number, default: 1 },
    ts: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

module.exports = model('Event', EventSchema);
