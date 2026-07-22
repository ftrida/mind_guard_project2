import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const GameScore = sequelize.define('GameScore', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  gameName: {
    type: DataTypes.ENUM('Memory Match', 'Breathing Tap', 'Focus Challenge', 'Color Relax'),
    allowNull: false
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
});
