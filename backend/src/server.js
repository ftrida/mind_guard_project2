import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Configurations & Database
dotenv.config();

// FIX F-03: Fail fast if critical env vars are missing — never use hardcoded fallbacks
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}

import { connectDB } from './config/db.js';

// Route Imports
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

// Middlewares
import { errorHandler } from './middleware/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Programmatic directory check for Multer uploads
const uploadDir = path.join(path.resolve(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Copy default-avatar if not exists
const defaultAvatarPath = path.join(uploadDir, 'default-avatar.png');
if (!fs.existsSync(defaultAvatarPath)) {
  fs.writeFileSync(defaultAvatarPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));
}

// Database Connection
connectDB();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading images uploaded to server
}));
app.use(mongoSanitize());

// FIX F-15: Filter undefined entries from CORS origin list
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// FIX F-05: Dedicated, strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                    // max 10 attempts per IP per window
  message: { success: false, error: 'Too many authentication attempts from this IP. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter (non-auth routes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api', apiLimiter);

// FIX F-14: Explicit body size limits to prevent payload inflation attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// FIX F-07: Serve uploads with Content-Disposition: attachment so browsers
// download files rather than execute them inline (prevents stored XSS)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Content-Disposition', 'attachment');
  next();
}, express.static(uploadDir));

// Route Mounts
// FIX F-05: Apply strict auth limiter to all authentication routes
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

// Database Seeding logic
import { seedDatabase } from './services/seeder.js';
seedDatabase();

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`MindGuard backend running on port ${PORT}`);
});
