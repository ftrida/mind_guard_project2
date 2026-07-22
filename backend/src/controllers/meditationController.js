import { MeditationHistory, MeditationFavorite } from '../models/index.js';

export const logMeditationSession = async (req, res, next) => {
  try {
    const { trackId, trackTitle, category, durationSeconds } = req.body;

    if (!trackId || !trackTitle || !category || !durationSeconds) {
      return res.status(400).json({ success: false, error: 'Please provide all details' });
    }

    const session = await MeditationHistory.create({
      userId: req.user.id,
      trackId,
      trackTitle,
      category,
      durationSeconds
    });

    res.status(201).json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

export const getMeditationHistory = async (req, res, next) => {
  try {
    const history = await MeditationHistory.findAll({
      where: { userId: req.user.id },
      order: [['timestamp', 'DESC']],
      limit: 10
    });
    res.status(200).json({ success: true, count: history.length, history });
  } catch (error) {
    next(error);
  }
};

export const toggleFavorite = async (req, res, next) => {
  try {
    const { trackId } = req.body;

    if (!trackId) {
      return res.status(400).json({ success: false, error: 'Please provide track ID' });
    }

    const favoriteExists = await MeditationFavorite.findOne({
      where: { userId: req.user.id, trackId }
    });

    if (favoriteExists) {
      await favoriteExists.destroy();
      return res.status(200).json({ success: true, favorited: false, message: 'Removed from favorites' });
    } else {
      await MeditationFavorite.create({ userId: req.user.id, trackId });
      return res.status(201).json({ success: true, favorited: true, message: 'Added to favorites' });
    }
  } catch (error) {
    next(error);
  }
};

export const getFavorites = async (req, res, next) => {
  try {
    const favorites = await MeditationFavorite.findAll({ where: { userId: req.user.id } });
    res.status(200).json({ success: true, count: favorites.length, favorites });
  } catch (error) {
    next(error);
  }
};
