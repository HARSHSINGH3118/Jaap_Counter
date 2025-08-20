const { Router } = require('express');
const router = Router();

const {
  register,
  login,
  refreshToken,
  me,
  logout
} = require('../controllers/auth.controller');

const requireAuth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);

module.exports = router;
