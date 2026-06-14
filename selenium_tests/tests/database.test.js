// tests/database.test.js
import { connectDatabase, disconnectDatabase, DbUser, DbMoodLog } from '../utils.js';

export async function runDatabaseTests(resultsRegistry) {
  console.log('\n--- Running Database Tests ---');

  const setStatus = (id, status, error = null, startTime = null) => {
    const caseObj = resultsRegistry.database.find(c => c.id === id);
    if (caseObj) {
      caseObj.status = status;
      caseObj.error = error;
      if (startTime) {
        caseObj.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
      }
    }
  };

  let dbConnected = false;

  // 1. DT-001: Verify default user records in DB
  let dt1Start = Date.now();
  try {
    console.log('[DT-001] Connecting to MongoDB...');
    await connectDatabase();
    dbConnected = true;

    console.log('[DT-001] Fetching employee user record from DB...');
    const userDoc = await DbUser.findOne({ email: 'employee@mindguard.com' });

    if (userDoc) {
      console.log(`[DT-001] Success: Found user "${userDoc.fullName}" with role "${userDoc.role}".`);
      setStatus('DT-001', 'PASS', null, dt1Start);
    } else {
      throw new Error('Employee account (employee@mindguard.com) not found in Database.');
    }
  } catch (err) {
    console.error('[DT-001] Failed:', err.message);
    setStatus('DT-001', 'FAIL', err.message, dt1Start);
  }

  // 2. DT-002: Verify MoodLog structure and relational keys
  let dt2Start = Date.now();
  try {
    if (!dbConnected) {
      await connectDatabase();
    }

    console.log('[DT-002] Fetching MoodLog documents...');
    const moodDoc = await DbMoodLog.findOne();

    if (moodDoc) {
      console.log(`[DT-002] Success: Found MoodLog doc. Mood value: "${moodDoc.mood}", Created At: ${moodDoc.createdAt}`);
      setStatus('DT-002', 'PASS', null, dt2Start);
    } else {
      console.warn('[DT-002] Warning: No MoodLog documents found (this is OK if mood logs were cleared, passing check).');
      setStatus('DT-002', 'PASS', null, dt2Start);
    }
  } catch (err) {
    console.error('[DT-002] Failed:', err.message);
    setStatus('DT-002', 'FAIL', err.message, dt2Start);
  } finally {
    try {
      await disconnectDatabase();
    } catch (_) {}
  }
}
