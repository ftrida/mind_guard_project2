import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  actorId: {
    type: DataTypes.INTEGER
  },
  actorEmail: {
    type: DataTypes.STRING
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  target: {
    type: DataTypes.STRING
  },
  details: {
    type: DataTypes.TEXT
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
});
