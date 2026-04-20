import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe, refresh, logout, logoutAll } from './auth.controller';
import { authGuard } from '../../middleware/authGuard';

const router = Router();

// Validation rules for registration
// These run before the controller — if they fail, the controller never executes
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

// Validation rules for login
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Public routes — no token needed
// POST /auth/register — create a new account
router.post('/register', registerValidation, register);

// POST /auth/login — login with email and password
router.post('/login', loginValidation, login);

// POST /auth/refresh — get a new access token using a refresh token
router.post('/refresh', refresh);

// POST /auth/logout — revoke a refresh token
router.post('/logout', logout);

// Protected routes — authGuard middleware runs first
// If the JWT is missing or invalid, authGuard returns 401 and the handler never runs

// GET /auth/me — get the currently logged in user's profile
router.get('/me', authGuard, getMe);

// POST /auth/logout-all — revoke all refresh tokens for this user
router.post('/logout-all', authGuard, logoutAll);

export default router;
