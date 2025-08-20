const { verifyAccess } = require('../utils/jwt');

module.exports = function (req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Missing Authorization header' });

  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid Authorization header' });
  }

  try {
    const payload = verifyAccess(parts[1]);
    req.user = { uid: payload.uid, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
