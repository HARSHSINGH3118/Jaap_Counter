const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');

// helpers
function signAccessToken(user) {
  return jwt.sign(
    { uid: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { uid: user._id, email: user.email, tokenId: uuidv4() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

// controllers
exports.register = async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'User already exists' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, hash, displayName });

    const access = signAccessToken(user);
    const refresh = signRefreshToken(user);

    res.json({ access, refresh, user: { id: user._id, email: user.email, displayName: user.displayName } });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const access = signAccessToken(user);
    const refresh = signRefreshToken(user);

    res.json({ access, refresh, user: { id: user._id, email: user.email, displayName: user.displayName } });
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refresh } = req.body;
    if (!refresh) return res.status(400).json({ error: 'Missing refresh token' });

    const payload = jwt.verify(refresh, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.uid);
    if (!user) return res.status(401).json({ error: 'Invalid refresh token' });

    const access = signAccessToken(user);
    res.json({ access });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: user.public() });
  } catch (err) {
    next(err);
  }
};


exports.logout = async (req, res, next) => {
  try {
    res.json({ ok: true, message: 'Logged out (client must drop tokens)' });
  } catch (err) {
    next(err);
  }
};
