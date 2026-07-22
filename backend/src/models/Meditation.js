import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const MeditationHistory = sequelize.define('MeditationHistory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  trackId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  trackTitle: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  durationSeconds: {
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

export const MeditationFavorite = sequelize.define('MeditationFavorite', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  trackId: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: true
});
