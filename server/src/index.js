require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();

/* -------------------- App & Security -------------------- */
app.set('x-powered-by', false);
app.set('trust proxy', 1); // for deployments behind proxies (Render/Heroku/etc)

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // safe for APIs/static
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* -------------------- CORS -------------------- */
/* Support either:
   - CORS_ORIGIN="http://localhost:5173"
   - CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
*/
function parseOrigins(str) {
  return (str || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
const originList = new Set([
  ...parseOrigins(process.env.CORS_ORIGIN),
  ...parseOrigins(process.env.CORS_ORIGINS),
]);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow Postman / same-origin (no Origin header)
      if (!origin) return cb(null, true);
      if (originList.size === 0 || originList.has(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
// NOTE: No app.options('*', ...) on Express 5 — CORS middleware handles preflights

/* -------------------- Rate Limiting -------------------- */
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

/* -------------------- Health -------------------- */
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'jaap-counter-api',
    ts: Date.now(),
    env: process.env.NODE_ENV || 'development',
  });
});

/* -------------------- Routes -------------------- */
app.use('/auth', require('./routes/auth.routes'));
app.use('/counters', require('./routes/counter.routes'));

/* -------------------- 404 & Error Handling -------------------- */
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  // CORS origin errors or generic
  const status = err.status || (err.message?.startsWith('CORS blocked') ? 403 : 500);
  console.error('[ERROR]', err.message);
  res.status(status).json({ error: err.message || 'Server Error' });
});

/* -------------------- DB Connect & Server Start -------------------- */
const PORT = Number(process.env.PORT || 5000);
const MONGO_URI = process.env.MONGO_URI;

async function start() {
  if (!MONGO_URI) {
    console.error('Missing MONGO_URI in .env');
    process.exit(1);
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(MONGO_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB connected');

    // In dev, sync indexes to keep schema & DB aligned (helps remove stray indexes)
    if ((process.env.NODE_ENV || 'development') !== 'production') {
      try {
        const User = require('./models/User');
        const Counter = require('./models/Counter');
        const Event = require('./models/Event');
        await Promise.allSettled([
          User.syncIndexes(),
          Counter.syncIndexes(),
          Event.syncIndexes(),
        ]);
        console.log('Indexes synchronized (dev mode)');
      } catch (idxErr) {
        console.warn('Index sync warning:', idxErr.message);
      }
    }

    app.listen(PORT, () => {
      const allowed = originList.size ? Array.from(originList).join(', ') : '(any origin)';
      console.log(`API running on http://localhost:${PORT}`);
      console.log(`CORS allowed origins: ${allowed}`);
    });
  } catch (e) {
    console.error('DB connection failed:', e.message);
    process.exit(1);
  }
}

start();

/* -------------------- Process Safety -------------------- */
process.on('unhandledRejection', (r) => console.error('UNHANDLED REJECTION', r));
process.on('uncaughtException', (e) => {
  console.error('UNCAUGHT EXCEPTION', e);
  process.exit(1);
});

module.exports = app;
