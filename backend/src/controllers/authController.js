import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { User, Settings, AuditLog, ResetToken, TokenDenylist } from '../models/index.js';
import nodemailer from 'nodemailer';

const sendTokenResponse = (user, statusCode, res) => {
  const jti = crypto.randomUUID();

  const token = jwt.sign(
    { id: user.id, jti },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: true,
    sameSite: 'lax'
  };

  res.status(statusCode).cookie('token', token, cookieOptions).json({
    success: true,
    token, // Also return token for clients storing in localStorage
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      company: user.company,
      department: user.department,
      profilePhoto: user.profilePhoto,
      streak: user.streak
    }
  });
};

export const register = async (req, res, next) => {
  try {
    const {
      fullName, email, password, age, gender,
      company, employeeId, department, companyId,
      emergencyContactName, emergencyContactPhone, emergencyContactEmail, phone
    } = req.body;

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'User already registered with this email' });
    }

    const profilePhoto = req.file ? `/uploads/${req.file.filename}` : '/uploads/default-avatar.png';

    const user = await User.create({
      fullName,
      email,
      password,
      age: age ? Number(age) : null,
      gender,
      company,
      employeeId,
      department,
      companyId,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactEmail,
      phone,
      profilePhoto,
      streak: 1,
      lastActive: new Date()
    });

    await Settings.create({ userId: user.id });

    await AuditLog.create({
      actorId: user.id,
      actorEmail: user.email,
      action: 'REGISTER',
      details: `User registered: ${user.fullName} (${user.role})`
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Update streak
    const now = new Date();
    const lastActive = new Date(user.lastActive || now);
    const diffDays = Math.abs(now - lastActive) / (1000 * 60 * 60 * 24);

    if (diffDays >= 1 && diffDays < 2) {
      user.streak += 1;
    } else if (diffDays >= 2) {
      user.streak = 1;
    } else if (user.streak === 0) {
      user.streak = 1;
    }
    user.lastActive = now;
    await user.save();

    await AuditLog.create({
      actorId: user.id,
      actorEmail: user.email,
      action: 'LOGIN',
      details: `User logged in: ${user.fullName}`
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.jti && decoded.exp) {
          await TokenDenylist.create({
            jti: decoded.jti,
            expiresAt: new Date(decoded.exp * 1000)
          });
        }
      } catch {
        // Token already invalid — no action needed
      }
    }

    if (req.user) {
      await AuditLog.create({
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'LOGOUT',
        details: `User logged out: ${req.user.fullName}`
      });
    }

    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    const settings = await Settings.findOne({ where: { userId: req.user.id } });

    res.status(200).json({ success: true, user, settings });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    const genericResponse = {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = ResetToken.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await ResetToken.destroy({ where: { userId: user.id } });
    await ResetToken.create({ userId: user.id, tokenHash, expiresAt });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
          port: Number(process.env.EMAIL_PORT) || 2525,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        await transporter.sendMail({
          from: `"MindGuard Safety" <${process.env.ADMIN_EMAIL}>`,
          to: user.email,
          subject: 'MindGuard Password Reset Request',
          text: `You requested a password reset.\n\nClick the link below to reset your password (valid for 10 minutes):\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`
        });
      }
    } catch (emailErr) {
      console.error('SMTP delivery failed:', emailErr.code || emailErr.message);
    }

    res.status(200).json(genericResponse);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { resettoken } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: 'Please provide a new password' });
    }

    const tokenHash = ResetToken.hashToken(resettoken);
    const tokenRecord = await ResetToken.findOne({
      where: {
        tokenHash,
        used: false,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!tokenRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    }

    const user = await User.findByPk(tokenRecord.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User no longer exists' });
    }

    user.password = password;
    await user.save();
    await ResetToken.destroy({ where: { id: tokenRecord.id } });

    await AuditLog.create({
      actorId: user.id,
      actorEmail: user.email,
      action: 'PASSWORD_RESET',
      details: `Password reset successfully for ${user.fullName}`
    });

    res.status(200).json({ success: true, message: 'Password updated successfully. Please log in.' });
  } catch (error) {
    next(error);
  }
};
