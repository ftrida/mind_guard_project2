import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const FocusSession = sequelize.define('FocusSession', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('completed', 'paused', 'stopped'),
    allowNull: false
  },
  taskName: {
    type: DataTypes.STRING,
    defaultValue: 'General Focus'
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
});
