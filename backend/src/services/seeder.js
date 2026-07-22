import { User, Settings, StressScore, MoodLog, FocusSession, MeditationHistory, Notification } from '../models/index.js';

export const seedDatabase = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.log('Seeder disabled in production.');
    return;
  }

  try {
    const userCount = await User.count();
    if (userCount > 0) {
      console.log('Database already has data. Skipping seeder.');
      return;
    }

    console.log('Database is empty. Seeding default data...');

    const seedPassword = process.env.SEED_PASSWORD;
    if (!seedPassword) {
      console.error('SEED_PASSWORD env var not set. Skipping seeder to avoid insecure defaults.');
      return;
    }

    // 1. Create Default Users
    const employee = await User.create({
      fullName: 'John Doe',
      email: 'employee@mindguard.com',
      password: seedPassword,
      role: 'Employee',
      age: 28,
      gender: 'Male',
      company: 'Acme Corp',
      employeeId: 'EMP-9082',
      department: 'Engineering',
      companyId: 'ACME-100',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '+15550199',
      emergencyContactEmail: 'jane@emergency.com',
      phone: '+15550100',
      profilePhoto: '/uploads/default-avatar.png',
      streak: 5,
      lastActive: new Date()
    });
    await Settings.create({ userId: employee.id });

    const admin = await User.create({
      fullName: 'Alice Smith',
      email: 'admin@mindguard.com',
      password: seedPassword,
      role: 'Admin',
      age: 35,
      gender: 'Female',
      company: 'Acme Corp',
      employeeId: 'ADM-1002',
      department: 'Human Resources',
      companyId: 'ACME-100',
      phone: '+15550200',
      profilePhoto: '/uploads/default-avatar.png',
      streak: 3,
      lastActive: new Date()
    });
    await Settings.create({ userId: admin.id });

    const superAdmin = await User.create({
      fullName: 'Robert Johnson',
      email: 'superadmin@mindguard.com',
      password: seedPassword,
      role: 'Super Admin',
      age: 42,
      gender: 'Male',
      company: 'Acme Corp',
      employeeId: 'SAD-0001',
      department: 'Executive',
      companyId: 'ACME-100',
      phone: '+15550300',
      profilePhoto: '/uploads/default-avatar.png',
      streak: 1,
      lastActive: new Date()
    });
    await Settings.create({ userId: superAdmin.id });

    // 2. Seed Stress History
    const stressData = [
      { offset: 6, score: 25, category: 'Low',      source: 'Chat' },
      { offset: 5, score: 35, category: 'Medium',   source: 'Chat' },
      { offset: 4, score: 60, category: 'High',     source: 'Chat' },
      { offset: 3, score: 78, category: 'Critical', source: 'Chat' },
      { offset: 2, score: 45, category: 'Medium',   source: 'MoodLog' },
      { offset: 1, score: 30, category: 'Medium',   source: 'Chat' },
      { offset: 0, score: 15, category: 'Low',      source: 'Chat' }
    ];

    for (const data of stressData) {
      const date = new Date();
      date.setDate(date.getDate() - data.offset);
      await StressScore.create({
        userId: employee.id,
        score: data.score,
        category: data.category,
        source: data.source,
        createdAt: date
      });
    }

    // 3. Seed Mood logs
    const moodData = [
      { offset: 4, mood: 'Tired',   note: 'Feeling stressed about deadlines.' },
      { offset: 3, mood: 'Anxious', note: 'Very high workload today.' },
      { offset: 2, mood: 'Calm',    note: 'Had a team talk, resolved some stuff.' },
      { offset: 1, mood: 'Neutral', note: 'Regular workday.' },
      { offset: 0, mood: 'Happy',   note: 'Feeling great, sprint completed!' }
    ];

    for (const data of moodData) {
      const date = new Date();
      date.setDate(date.getDate() - data.offset);
      await MoodLog.create({
        userId: employee.id,
        mood: data.mood,
        note: data.note,
        createdAt: date
      });
    }

    // 4. Seed Focus Sessions & Meditation
    const focusData = [
      { offset: 3, duration: 25, status: 'completed', task: 'Refactoring APIs' },
      { offset: 2, duration: 50, status: 'completed', task: 'Debugging schemas' },
      { offset: 1, duration: 25, status: 'stopped',   task: 'Writing tests' }
    ];

    for (const data of focusData) {
      const date = new Date();
      date.setDate(date.getDate() - data.offset);
      await FocusSession.create({
        userId: employee.id,
        durationMinutes: data.duration,
        status: data.status,
        taskName: data.task,
        createdAt: date
      });
    }

    const medData = [
      { offset: 2, trackId: 'm1', title: 'Calm Breathing Practice', cat: 'Breathing', dur: 300 },
      { offset: 0, trackId: 'm2', title: 'Deep Sleep Relaxation',   cat: 'Sleep',     dur: 600 }
    ];

    for (const data of medData) {
      const date = new Date();
      date.setDate(date.getDate() - data.offset);
      await MeditationHistory.create({
        userId: employee.id,
        trackId: data.trackId,
        trackTitle: data.title,
        category: data.cat,
        durationSeconds: data.dur,
        createdAt: date
      });
    }

    // 5. Welcome Notification
    await Notification.create({
      userId: employee.id,
      title: 'Welcome to MindGuard!',
      message: 'Explore your wellness toolkit: check your stress dashboard, try guided breathing meditation, or chat with our AI wellness coach.',
      type: 'recommendation'
    });

    console.log('Seeding complete. Default accounts created for development.');
  } catch (error) {
    console.error('Failed to seed database:', error.message);
  }
};
