import { sequelize, GameScore, User } from '../models/index.js';

export const saveGameScore = async (req, res, next) => {
  try {
    const { gameName, score } = req.body;

    if (!gameName || score === undefined) {
      return res.status(400).json({ success: false, error: 'Please specify game name and score value' });
    }

    const gameLog = await GameScore.create({
      userId: req.user.id,
      gameName,
      score: Number(score)
    });

    res.status(201).json({ success: true, gameLog });
  } catch (error) {
    next(error);
  }
};

export const getLeaderboard = async (req, res, next) => {
  try {
    const { gameName } = req.query;

    const whereClause = gameName ? { gameName } : {};

    const rawScores = await GameScore.findAll({
      where: whereClause,
      order: [['score', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'fullName', 'email', 'profilePhoto', 'department']
      }]
    });

    // Filter to highest score per user
    const userMap = new Map();
    rawScores.forEach(entry => {
      if (!userMap.has(entry.userId)) {
        userMap.set(entry.userId, {
          _id: entry.userId,
          highestScore: entry.score,
          gameName: entry.gameName,
          timestamp: entry.createdAt,
          userDetails: entry.user
        });
      }
    });

    const leaderboard = Array.from(userMap.values()).slice(0, 10);

    res.status(200).json({ success: true, count: leaderboard.length, leaderboard });
  } catch (error) {
    next(error);
  }
};
