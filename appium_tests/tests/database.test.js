// tests/database.test.js - Appium Database Tests via Mongoose (MDT-001 to MDT-005)

import mongoose from 'mongoose';
import { updateResult } from '../utils.js';

const MONGO_URI = 'mongodb://127.0.0.1:27017/mindguard';

async function connect() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
    console.log('[DB] Connected to MongoDB for Appium DB tests.');
  }
}

async function disconnect() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[DB] Disconnected from MongoDB.');
  }
}

export async function runDatabaseTests(driver, registry) {
  console.log('\n--- Running Database Tests (Appium) ---');

  try {
    await connect();

    // MDT-001: Default employee user exists
    try {
      const userDoc = await mongoose.connection.db.collection('users').findOne({ email: 'employee@mindguard.com' });
      const pass = userDoc !== null && userDoc.role === 'Employee';
      updateResult(registry, 'database', 'MDT-001', pass ? 'PASS' : 'FAIL',
        pass ? null : 'Employee user not found or wrong role', '~100ms');
      console.log(`[MDT-001] ${pass ? 'PASS' : 'FAIL'}: Employee user: ${userDoc ? userDoc.fullName : 'not found'}`);
    } catch (err) {
      updateResult(registry, 'database', 'MDT-001', 'FAIL', err.message, 'N/A');
    }

    // MDT-002: MoodLog has valid user reference
    try {
      const moodLog = await mongoose.connection.db.collection('moodlogs').findOne({});
      const pass = moodLog !== null && moodLog.user !== null;
      updateResult(registry, 'database', 'MDT-002', pass ? 'PASS' : 'FAIL',
        pass ? null : 'No mood log found or missing user ref', '~100ms');
      console.log(`[MDT-002] ${pass ? 'PASS' : 'FAIL'}: MoodLog user ref: ${moodLog?.user}`);
    } catch (err) {
      updateResult(registry, 'database', 'MDT-002', 'FAIL', err.message, 'N/A');
    }

    // MDT-003: FocusSession documents exist (seeded 3)
    try {
      const count = await mongoose.connection.db.collection('focussessions').countDocuments();
      const pass = count >= 3;
      updateResult(registry, 'database', 'MDT-003', pass ? 'PASS' : 'FAIL',
        pass ? null : `Only ${count} focus sessions found, expected >= 3`, '~100ms');
      console.log(`[MDT-003] ${pass ? 'PASS' : 'FAIL'}: FocusSession count: ${count}`);
    } catch (err) {
      updateResult(registry, 'database', 'MDT-003', 'FAIL', err.message, 'N/A');
    }

    // MDT-004: StressScore records for employee (seeded 7)
    try {
      const user = await mongoose.connection.db.collection('users').findOne({ email: 'employee@mindguard.com' });
      const count = await mongoose.connection.db.collection('stressscores').countDocuments({ user: user?._id });
      const pass = count >= 7;
      updateResult(registry, 'database', 'MDT-004', pass ? 'PASS' : 'FAIL',
        pass ? null : `Only ${count} stress scores, expected >= 7`, '~150ms');
      console.log(`[MDT-004] ${pass ? 'PASS' : 'FAIL'}: StressScore count: ${count}`);
    } catch (err) {
      updateResult(registry, 'database', 'MDT-004', 'FAIL', err.message, 'N/A');
    }

    // MDT-005: Settings document exists for each user
    try {
      const userCount = await mongoose.connection.db.collection('users').countDocuments();
      const settingsCount = await mongoose.connection.db.collection('settings').countDocuments();
      const pass = settingsCount >= userCount;
      updateResult(registry, 'database', 'MDT-005', pass ? 'PASS' : 'FAIL',
        pass ? null : `Settings (${settingsCount}) < Users (${userCount})`, '~150ms');
      console.log(`[MDT-005] ${pass ? 'PASS' : 'FAIL'}: Users: ${userCount}, Settings: ${settingsCount}`);
    } catch (err) {
      updateResult(registry, 'database', 'MDT-005', 'FAIL', err.message, 'N/A');
    }

    await disconnect();
  } catch (connErr) {
    console.error('[DB] Connection failed:', connErr.message);
    ['MDT-001','MDT-002','MDT-003','MDT-004','MDT-005'].forEach(id => {
      updateResult(registry, 'database', id, 'FAIL', `DB Connection failed: ${connErr.message}`, 'N/A');
    });
  }

  console.log('[Database Tests] Completed.');
}
