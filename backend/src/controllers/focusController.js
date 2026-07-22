import { FocusSession } from '../models/index.js';

export const saveFocusSession = async (req, res, next) => {
  try {
    const { durationMinutes, status, taskName } = req.body;

    if (!durationMinutes || !status) {
      return res.status(400).json({ success: false, error: 'Please specify session duration and status' });
    }

    const session = await FocusSession.create({
      userId: req.user.id,
      durationMinutes,
      status,
      taskName
    });

    res.status(201).json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

export const getFocusSessions = async (req, res, next) => {
  try {
    const sessions = await FocusSession.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ success: true, count: sessions.length, sessions });
  } catch (error) {
    next(error);
  }
};
