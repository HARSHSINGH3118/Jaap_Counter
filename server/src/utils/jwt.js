const jwt = require('jsonwebtoken');

exports.signAccess = (payload, opts = {}) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m', ...opts });

exports.signRefresh = (payload, opts = {}) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d', ...opts });

exports.verifyAccess = (token) => jwt.verify(token, process.env.JWT_SECRET);
exports.verifyRefresh = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);
