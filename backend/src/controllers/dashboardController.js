import { Op } from 'sequelize';
import { StressScore, MoodLog, Notification, MeditationHistory, FocusSession, GameScore } from '../models/index.js';
import { generateAIRecommendations } from '../services/aiService.js';

export const getDashboardData = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Fetch latest stress score
    const latestStress = await StressScore.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
    const currentScore = latestStress ? latestStress.score : 20;
    const currentCategory = latestStress ? latestStress.category : 'Low';

    // 2. Fetch today's mood
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMood = await MoodLog.findOne({
      where: {
        userId,
        createdAt: { [Op.gte]: startOfToday }
      },
      order: [['createdAt', 'DESC']]
    });

    // 3. Generate AI recommendations
    const recommendations = await generateAIRecommendations(currentScore, currentCategory);

    // 4. Fetch recent activity
    const recentFocus = await FocusSession.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 3
    });
    const recentMeditation = await MeditationHistory.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 3
    });
    const recentGames = await GameScore.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 3
    });

    const activities = [
      ...recentFocus.map(f => ({
        type: 'focus',
        title: `Completed ${f.durationMinutes}m Pomodoro`,
        detail: f.taskName,
        timestamp: f.createdAt
      })),
      ...recentMeditation.map(m => ({
        type: 'meditation',
        title: `Meditated: ${m.trackTitle}`,
        detail: `${Math.round(m.durationSeconds / 60)}m session`,
        timestamp: m.createdAt
      })),
      ...recentGames.map(g => ({
        type: 'game',
        title: `Played ${g.gameName}`,
        detail: `Score: ${g.score}`,
        timestamp: g.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);

    // 5. Fetch notification count
    const unreadNotifications = await Notification.count({ where: { userId, isRead: false } });

    // 6. Calculate wellness score
    const totalMed = await MeditationHistory.count({ where: { userId } });
    const totalFocus = await FocusSession.count({ where: { userId, status: 'completed' } });
    const streakBonus = Math.min((req.user.streak || 0) * 5, 25);
    const activityBonus = Math.min((totalMed * 10) + (totalFocus * 5), 45);
    const stressDeduction = Math.round(currentScore * 0.3);
    const wellnessScore = Math.max(10, Math.min(100, 50 + streakBonus + activityBonus - stressDeduction));

    // 7. Progress chart data
    const stressLogs = await StressScore.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 7
    });
    const progressChart = stressLogs.map(log => ({
      score: log.score,
      source: log.source,
      date: log.createdAt
    })).reverse();

    res.status(200).json({
      success: true,
      data: {
        welcomeMessage: `Welcome back, ${req.user.fullName}!`,
        currentStressScore: currentScore,
        stressCategory: currentCategory,
        todayMood: todayMood ? todayMood.mood : null,
        streak: req.user.streak,
        wellnessScore,
        activities,
        recommendations,
        unreadNotifications,
        progressChart
      }
    });
  } catch (error) {
    next(error);
  }
};
