import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const EmergencyAlert = sequelize.define('EmergencyAlert', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  contactName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contactPhone: {
    type: DataTypes.STRING
  },
  contactEmail: {
    type: DataTypes.STRING
  },
  triggeredByScore: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('sent', 'cancelled', 'failed'),
    defaultValue: 'sent'
  },
  details: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
});
