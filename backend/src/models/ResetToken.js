import { DataTypes } from 'sequelize';
import crypto from 'crypto';
import { sequelize } from '../config/db.js';

export const ResetToken = sequelize.define('ResetToken', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tokenHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
});

ResetToken.hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');
