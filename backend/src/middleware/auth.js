import jwt from 'jsonwebtoken';
import { User, TokenDenylist } from '../models/index.js';

export const protect = async (req, res, next) => {
  let token;

  // 1. Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Check for token in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  // FIX F-03: No hardcoded fallback — server must provide JWT_SECRET
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set.');
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token revoked
    if (decoded.jti) {
      const revoked = await TokenDenylist.findOne({ where: { jti: decoded.jti } });
      if (revoked) {
        return res.status(401).json({ success: false, error: 'Token has been revoked. Please log in again.' });
      }
    }

    // Get user from database using Sequelize findByPk
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
  }
};
