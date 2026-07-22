import { sequelize } from '../config/db.js';
import { User } from './User.js';
import { Chat, Message } from './Chat.js';
import { EmergencyAlert } from './EmergencyAlert.js';
import { FocusSession } from './FocusSession.js';
import { GameScore } from './GameScore.js';
import { MeditationHistory, MeditationFavorite } from './Meditation.js';
import { MoodLog } from './MoodLog.js';
import { Notification } from './Notification.js';
import { ResetToken } from './ResetToken.js';
import { Settings } from './Settings.js';
import { StressScore } from './StressScore.js';
import { TokenDenylist } from './TokenDenylist.js';
import { AuditLog } from './AuditLog.js';

// Define Relational Associations
User.hasMany(Chat, { foreignKey: 'userId', as: 'chats', onDelete: 'CASCADE' });
Chat.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Chat.hasMany(Message, { foreignKey: 'chatId', as: 'messages', onDelete: 'CASCADE' });
Message.belongsTo(Chat, { foreignKey: 'chatId', as: 'chat' });

User.hasMany(EmergencyAlert, { foreignKey: 'userId', as: 'alerts', onDelete: 'CASCADE' });
EmergencyAlert.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(FocusSession, { foreignKey: 'userId', as: 'focusSessions', onDelete: 'CASCADE' });
FocusSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(GameScore, { foreignKey: 'userId', as: 'gameScores', onDelete: 'CASCADE' });
GameScore.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(MeditationHistory, { foreignKey: 'userId', as: 'meditationHistory', onDelete: 'CASCADE' });
MeditationHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(MeditationFavorite, { foreignKey: 'userId', as: 'meditationFavorites', onDelete: 'CASCADE' });
MeditationFavorite.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(MoodLog, { foreignKey: 'userId', as: 'moodLogs', onDelete: 'CASCADE' });
MoodLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ResetToken, { foreignKey: 'userId', as: 'resetTokens', onDelete: 'CASCADE' });
ResetToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Settings, { foreignKey: 'userId', as: 'settings', onDelete: 'CASCADE' });
Settings.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(StressScore, { foreignKey: 'userId', as: 'stressScores', onDelete: 'CASCADE' });
StressScore.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(AuditLog, { foreignKey: 'actorId', as: 'auditLogs', onDelete: 'SET NULL' });
AuditLog.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

export {
  sequelize,
  User,
  Chat,
  Message,
  EmergencyAlert,
  FocusSession,
  GameScore,
  MeditationHistory,
  MeditationFavorite,
  MoodLog,
  Notification,
  ResetToken,
  Settings,
  StressScore,
  TokenDenylist,
  AuditLog
};
