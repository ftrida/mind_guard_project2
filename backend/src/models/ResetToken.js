import mongoose from 'mongoose';
import crypto from 'crypto';

const resetTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Store only the SHA-256 hash — never the raw token
  tokenHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Auto-delete expired tokens from DB
resetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static helper: hash a raw token
resetTokenSchema.statics.hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

export const ResetToken = mongoose.model('ResetToken', resetTokenSchema);
