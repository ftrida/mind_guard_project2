import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}

import { connectDB, sequelize } from './config/db.js';
import './models/index.js'; // initialize model associations

import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import chatRoutes from './routes/chats.js';
import moodRoutes from './routes/mood.js';
import meditationRoutes from './routes/meditation.js';
import focusRoutes from './routes/focus.js';
import gameRoutes from './routes/games.js';
import alertRoutes from './routes/alerts.js';
import notificationRoutes from './routes/notifications.js';
import profileRoutes from './routes/profile.js';
import adminRoutes from './routes/admin.js';
import searchRoutes from './routes/search.js';
import { errorHandler } from './middleware/error.js';
import { seedDatabase } from './services/seeder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const uploadDir = path.join(path.resolve(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const defaultAvatarPath = path.join(uploadDir, 'default-avatar.png');
if (!fs.existsSync(defaultAvatarPath)) {
  fs.writeFileSync(defaultAvatarPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));
}

// Database Connection & Sync
connectDB().then(async () => {
  try {
    await sequelize.sync();
    console.log('MySQL Database models synchronized.');
    await seedDatabase();
  } catch (err) {
    console.error('Failed to sync MySQL models:', err.message);
  }
});

app.use(helmet({
  crossOriginResourcePolicy: false
}));

const configuredClientUrls = (process.env.CLIENT_URL || '')
  .split(',')
  .map(url => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...configuredClientUrls
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(cleanedOrigin) || configuredClientUrls.some(u => cleanedOrigin.startsWith(u))) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', database: 'MySQL', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', database: 'MySQL', timestamp: new Date().toISOString() });
});

const shouldSkipRateLimit = () => process.env.DISABLE_RATE_LIMITS === 'true';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many authentication attempts from this IP. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes' },
  skip: shouldSkipRateLimit
});
app.use('/api', apiLimiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use('/uploads', (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'].includes(ext)) {
    res.setHeader('Content-Disposition', 'inline');
  } else {
    res.setHeader('Content-Disposition', 'attachment');
  }
  next();
}, express.static(uploadDir));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/meditation', meditationRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`MindGuard MySQL backend running on port ${PORT}`);
});
