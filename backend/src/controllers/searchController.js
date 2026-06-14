import { User } from '../models/User.js';
import { Chat } from '../models/Chat.js';
import { MoodLog } from '../models/MoodLog.js';
import { Notification } from '../models/Notification.js';

// @desc    Perform a global search across models based on user role
// @route   GET /api/search
// @access  Private
export const globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Please enter a search query' });
    }

    // FIX F-09: Escape regex special characters to prevent ReDoS and data enumeration
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
      results.employees = await User.find({
        role: 'Employee',
        $or: [
          { fullName: { $regex: escaped, $options: 'i' } },
          { email: { $regex: escaped, $options: 'i' } },
          { department: { $regex: escaped, $options: 'i' } }
        ]
      }).limit(5);
    }

    // 2. Chat Search (Admins search all, Employees search own)
    const chatQuery = isAdmin ? {} : { user: userId };
    results.chats = await Chat.find({
      ...chatQuery,
      'messages.content': { $regex: escaped, $options: 'i' }
    })
      .populate('user', 'fullName email profilePhoto')
      .limit(5);

    // 3. Mood Search (Employees search own)
    const moodQuery = isAdmin ? {} : { user: userId };
    results.moods = await MoodLog.find({
      ...moodQuery,
      $or: [
        { mood: { $regex: escaped, $options: 'i' } },
        { note: { $regex: escaped, $options: 'i' } }
      ]
    })
      .populate('user', 'fullName email')
      .limit(5);

    // 4. Notification Search (Admins search all, Employees search own)
    const notifQuery = isAdmin ? {} : { user: userId };
    results.notifications = await Notification.find({
      ...notifQuery,
      $or: [
        { title: { $regex: escaped, $options: 'i' } },
        { message: { $regex: escaped, $options: 'i' } }
      ]
    }).limit(5);

    res.status(200).json({
      success: true,
      query: q,        // return original query in response (not escaped version)
      results
    });
  } catch (error) {
    next(error);
  }
};
