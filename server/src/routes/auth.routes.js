const { Router } = require('express');
const router = Router();

const {
  register,
  login,
  refreshToken,
  me,
  logout
} = require('../controllers/auth.controller');

const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', auth, me);
router.post('/logout', logout);

module.exports = router;
