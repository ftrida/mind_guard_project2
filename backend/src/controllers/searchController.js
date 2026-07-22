import { Op } from 'sequelize';
import { User, Chat, Message, MoodLog, Notification } from '../models/index.js';

export const globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Please enter a search query' });
    }

    const term = `%${q}%`;
    const isAdmin = ['Admin', 'Super Admin'].includes(req.user.role);
    const userId = req.user.id;

    const results = {
      employees: [],
      chats: [],
      moods: [],
      notifications: []
    };

    // 1. Employee Search (Admin only)
    if (isAdmin) {
      results.employees = await User.findAll({
        where: {
          role: 'Employee',
          [Op.or]: [
            { fullName: { [Op.like]: term } },
            { email: { [Op.like]: term } },
            { department: { [Op.like]: term } }
          ]
        },
        limit: 5
      });
    }

    // 2. Chat Search
    const chatWhere = isAdmin ? {} : { userId };
    results.chats = await Chat.findAll({
      where: chatWhere,
      limit: 5,
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'profilePhoto'] },
        { model: Message, as: 'messages', where: { content: { [Op.like]: term } } }
      ]
    });

    // 3. Mood Search
    const moodWhere = isAdmin ? {} : { userId };
    moodWhere[Op.or] = [
      { mood: { [Op.like]: term } },
      { note: { [Op.like]: term } }
    ];

    results.moods = await MoodLog.findAll({
      where: moodWhere,
      limit: 5,
      include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }]
    });

    // 4. Notification Search
    const notifWhere = isAdmin ? {} : { userId };
    notifWhere[Op.or] = [
      { title: { [Op.like]: term } },
      { message: { [Op.like]: term } }
    ];

    results.notifications = await Notification.findAll({
      where: notifWhere,
      limit: 5
    });

    res.status(200).json({
      success: true,
      query: q,
      results
    });
  } catch (error) {
    next(error);
  }
};
