const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyRegistrationOTP);
router.post('/resend-otp', authController.resendRegistrationOTP);

// Worker Registration OTP Flow
router.post('/register-worker/send-otp', authController.registerWorkerSendOTP);
router.post('/register-worker/verify', authController.registerWorkerVerifyOTP);

router.post('/login', authController.login);

// Forgot Password Flow (Workers & Supervisors)
router.post('/forgot-password', authController.forgotPassword);
router.post('/forgot-password/send-otp', authController.forgotPasswordSendOTP);
router.post('/reset-password', authController.resetPassword);
router.post('/forgot-password/reset', authController.forgotPasswordReset);

router.get('/me', authMiddleware, authController.getMe);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/profile/:id', authMiddleware, authController.updateProfile);
router.put('/settings', authMiddleware, authController.updateSettings);
router.put('/change-password', authMiddleware, authController.changePassword);

module.exports = router;
