import { MoodLog, StressScore } from '../models/index.js';

export const logMood = async (req, res, next) => {
  try {
    const { mood, note } = req.body;

    if (!mood) {
      return res.status(400).json({ success: false, error: 'Please select a mood' });
    }

    const moodStressMap = {
      'Happy': 10,
      'Calm': 15,
      'Neutral': 30,
      'Tired': 45,
      'Anxious': 65,
      'Sad': 70,
      'Angry': 75
    };

    const estimatedScore = moodStressMap[mood] || 30;
    const estimatedCategory = estimatedScore > 70 ? 'High' : (estimatedScore > 40 ? 'Medium' : 'Low');

    const moodLog = await MoodLog.create({
      userId: req.user.id,
      mood,
      note
    });

    await StressScore.create({
      userId: req.user.id,
      score: estimatedScore,
      category: estimatedCategory,
      source: 'MoodLog'
    });

    res.status(201).json({ success: true, moodLog });
  } catch (error) {
    next(error);
  }
};

export const getMoodHistory = async (req, res, next) => {
  try {
    const history = await MoodLog.findAll({
      where: { userId: req.user.id },
      order: [['timestamp', 'DESC']]
    });
    res.status(200).json({ success: true, count: history.length, history });
  } catch (error) {
    next(error);
  }
};
