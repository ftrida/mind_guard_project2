import { User, Settings, AuditLog } from '../models/index.js';

export const updateProfile = async (req, res, next) => {
  try {
    const {
      fullName,
      age,
      gender,
      phone,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactEmail
    } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (fullName) user.fullName = fullName;
    if (age) user.age = Number(age);
    if (gender) user.gender = gender;
    if (phone) user.phone = phone;

    if (emergencyContactName) user.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone) user.emergencyContactPhone = emergencyContactPhone;
    if (emergencyContactEmail) user.emergencyContactEmail = emergencyContactEmail;

    if (req.file) {
      user.profilePhoto = `/uploads/${req.file.filename}`;
    }

    await user.save();

    await AuditLog.create({
      actorId: user.id,
      actorEmail: user.email,
      action: 'UPDATE_PROFILE',
      details: `User updated profile settings: ${user.fullName}`
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const { darkMode, notificationsEnabled, shareStressWithAdmin, language, conversationStyle } = req.body;

    let settings = await Settings.findOne({ where: { userId: req.user.id } });

    if (!settings) {
      settings = await Settings.create({ userId: req.user.id });
    }

    if (darkMode !== undefined) settings.darkMode = darkMode;
    if (notificationsEnabled !== undefined) settings.notificationsEnabled = notificationsEnabled;
    if (shareStressWithAdmin !== undefined) settings.shareStressWithAdmin = shareStressWithAdmin;
    if (language) settings.language = language;
    if (conversationStyle) settings.conversationStyle = conversationStyle;

    await settings.save();

    res.status(200).json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};
