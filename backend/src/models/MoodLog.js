import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const MoodLog = sequelize.define('MoodLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  mood: {
    type: DataTypes.ENUM('Happy', 'Calm', 'Neutral', 'Tired', 'Anxious', 'Sad', 'Angry'),
    allowNull: false
  },
  note: {
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
