import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const TokenDenylist = sequelize.define('TokenDenylist', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  jti: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  timestamps: true
});
