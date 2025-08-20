const { Schema, model } = require('mongoose');

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    hash: { type: String, required: true },
    displayName: { type: String, default: '' }
  },
  { timestamps: true }
);

UserSchema.methods.public = function () {
  return { id: this._id, email: this.email, displayName: this.displayName };
};

module.exports = model('User', UserSchema);
