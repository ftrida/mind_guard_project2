import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Settings = sequelize.define('Settings', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  darkMode: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notificationsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  shareStressWithAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: 'en'
  },
  conversationStyle: {
    type: DataTypes.ENUM('Supportive', 'Direct', 'Coach'),
    defaultValue: 'Supportive'
  }
}, {
  timestamps: true
});
