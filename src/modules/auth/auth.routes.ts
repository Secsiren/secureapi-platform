import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe, refresh, logout, logoutAll } from './auth.controller';
import { authGuard } from '../../middleware/authGuard';
import { authLimiter, refreshLimiter } from '../../middleware/rateLimiter';

const router = Router();

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// authLimiter added to register and login — 10 attempts per 15min per IP
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);

// refreshLimiter — 30 refreshes per 15min per IP
router.post('/refresh', refreshLimiter, refresh);

router.post('/logout', logout);

router.get('/me', authGuard, getMe);
router.post('/logout-all', authGuard, logoutAll);

export default router;
