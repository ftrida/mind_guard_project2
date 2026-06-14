// utils.js
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('../backend/.env') });

export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
export const API_URL = 'http://localhost:5000';
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mindguard';

// Selenium WebDriver initialization helper
export async function createDriver(headless = true) {
  const options = new chrome.Options();
  if (headless) {
    options.addArguments('--headless=new');
    options.addArguments('--disable-gpu');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
  }
  options.addArguments('--window-size=1920,1080');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  // Set default timeouts
  await driver.manage().setTimeouts({ implicit: 10000, pageLoad: 30000, script: 30000 });
  return driver;
}

// Database connectivity helpers
export async function connectDatabase() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
    console.log(`[DB Helper] Connected to database: ${MONGODB_URI}`);
  }
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[DB Helper] Disconnected from database.');
  }
}

// Custom simple schema definitions to avoid path issues
const UserSchema = new mongoose.Schema({}, { strict: false });
export const DbUser = mongoose.models.User || mongoose.model('User', UserSchema, 'users');

const MoodLogSchema = new mongoose.Schema({}, { strict: false });
export const DbMoodLog = mongoose.models.MoodLog || mongoose.model('MoodLog', MoodLogSchema, 'moodlogs');

const FocusSessionSchema = new mongoose.Schema({}, { strict: false });
export const DbFocusSession = mongoose.models.FocusSession || mongoose.model('FocusSession', FocusSessionSchema, 'focussessions');
