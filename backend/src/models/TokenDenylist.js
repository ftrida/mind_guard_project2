import mongoose from 'mongoose';

const tokenDenylistSchema = new mongoose.Schema({
  // JWT ID (jti) claim of the revoked token
  jti: {
    type: String,
    required: true,
    unique: true
  },
  // When this token would have naturally expired — used for TTL cleanup
  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

// Auto-delete denylist entries once the JWT they block has naturally expired
tokenDenylistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TokenDenylist = mongoose.model('TokenDenylist', tokenDenylistSchema);
