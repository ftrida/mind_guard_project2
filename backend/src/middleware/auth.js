import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { TokenDenylist } from '../models/TokenDenylist.js';

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

    // FIX F-11: Check if this token has been revoked (logout denylist)
    if (decoded.jti) {
      const revoked = await TokenDenylist.findOne({ jti: decoded.jti });
      if (revoked) {
        return res.status(401).json({ success: false, error: 'Token has been revoked. Please log in again.' });
      }
    }

    // Get user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
  }
};
