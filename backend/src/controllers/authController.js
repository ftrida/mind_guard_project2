import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Settings } from '../models/Settings.js';
import { AuditLog } from '../models/AuditLog.js';
import { ResetToken } from '../models/ResetToken.js';
import { TokenDenylist } from '../models/TokenDenylist.js';
import nodemailer from 'nodemailer';

// ── JWT HELPER ────────────────────────────────────────────────────────────────
// FIX F-03: No hardcoded fallback — JWT_SECRET must come from environment only.
// FIX F-10: Token is set in httpOnly cookie ONLY — not returned in response body.
// FIX F-11: Every token gets a unique jti (JWT ID) so it can be individually revoked.
// FIX F-12: secure flag is always true — use HTTPS (mkcert) in development.
const sendTokenResponse = (user, statusCode, res) => {
  const jti = crypto.randomUUID(); // unique token ID for denylist support

  const token = jwt.sign(
    { id: user._id, jti },
    process.env.JWT_SECRET,           // no fallback — server.js ensures this is set
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,                     // not readable by JavaScript
    secure: true,                       // FIX F-12: always require HTTPS
    sameSite: 'lax'
  };

  // FIX F-10: Token NOT included in JSON body — cookie only
  res.status(statusCode).cookie('token', token, cookieOptions).json({
    success: true,
    user: {
      id: user._id,
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

// @desc    Register a new employee/user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const {
      fullName, email, password, age, gender,
      company, employeeId, department, companyId,
      emergencyContactName, emergencyContactPhone, emergencyContactEmail, phone
    } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'User already registered with this email' });
    }

    const profilePhoto = req.file ? `/uploads/${req.file.filename}` : '/uploads/default-avatar.png';

    const user = await User.create({
      fullName, email, password,
      age: age ? Number(age) : undefined,
      gender, company, employeeId, department, companyId,
      emergencyContact: {
        name: emergencyContactName,
        phone: emergencyContactPhone,
        email: emergencyContactEmail
      },
      phone, profilePhoto,
      streak: 1,
      lastActive: new Date()
    });

    await Settings.create({ user: user._id });

    await AuditLog.create({
      actor: user._id,
      actorEmail: user.email,
      action: 'REGISTER',
      details: `User registered: ${user.fullName} (${user.role})`
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
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
      actor: user._id,
      actorEmail: user.email,
      action: 'LOGIN',
      details: `User logged in: ${user.fullName}`
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user — revoke JWT via denylist + clear cookie
// @route   GET /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    // FIX F-11: Revoke the current token by adding its jti to the denylist
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.jti && decoded.exp) {
          await TokenDenylist.create({
            jti: decoded.jti,
            expiresAt: new Date(decoded.exp * 1000) // convert Unix timestamp
          });
        }
      } catch {
        // Token already invalid — no action needed
      }
    }

    if (req.user) {
      await AuditLog.create({
        actor: req.user._id,
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

// @desc    Get current logged in user details
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const settings = await Settings.findOne({ user: req.user.id });

    res.status(200).json({ success: true, user, settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password — send reset link via email only
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // FIX: Always return the same response whether user exists or not (prevents email enumeration)
    const genericResponse = {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Generate raw token (only ever sent in the email — never in the API response)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = ResetToken.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // FIX F-04: Invalidate any previous unused tokens for this user
    await ResetToken.deleteMany({ user: user._id });

    // FIX F-04: Store only the hash — raw token never touches the database
    await ResetToken.create({ user: user._id, tokenHash, expiresAt });

    // Build reset URL — raw token goes into email only
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;

    // FIX F-06: No console.log of the token, email, or reset URL
    // Attempt SMTP delivery
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
      // FIX F-06: Log error type only — no token or email address in logs
      console.error('SMTP delivery failed:', emailErr.code || emailErr.message);
    }

    // FIX F-02: Token is NOT included in the response — email channel only
    res.status(200).json(genericResponse);
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password using token from email link
// @route   POST /api/auth/reset-password/:resettoken
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { resettoken } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: 'Please provide a new password' });
    }

    // FIX F-04: Look up hashed token in database — raw token never stored
    const tokenHash = ResetToken.hashToken(resettoken);
    const tokenRecord = await ResetToken.findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() } // not expired
    });

    if (!tokenRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    }

    const user = await User.findById(tokenRecord.user);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User no longer exists' });
    }

    // Update password and invalidate the token
    user.password = password;
    await user.save();
    await ResetToken.deleteOne({ _id: tokenRecord._id });

    await AuditLog.create({
      actor: user._id,
      actorEmail: user.email,
      action: 'PASSWORD_RESET',
      details: `Password reset successfully for ${user.fullName}`
    });

    res.status(200).json({ success: true, message: 'Password updated successfully. Please log in.' });
  } catch (error) {
    next(error);
  }
};
