const Counter = require('../models/Counter');
const Event = require('../models/Event');
const { v4: uuidv4 } = require('uuid');
const { Types } = require('mongoose');

const getUserId = (req) => req.user.uid;

async function recomputeCounter(uid, counterId) {
  const uidObj = new Types.ObjectId(uid);
  const cidObj = typeof counterId === 'string' ? new Types.ObjectId(counterId) : counterId;

  const counter = await Counter.findOne({ _id: cidObj, userId: uidObj });
  if (!counter) return { total: 0, daily: 0, streak: 0 };

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

  const sumExpr = {
    $switch: {
      branches: [
        { case: { $eq: ['$type', 'inc'] }, then: '$value' },
        { case: { $eq: ['$type', 'dec'] }, then: { $multiply: ['$value', -1] } }
      ],
      default: 0
    }
  };

  const [totalAgg] = await Event.aggregate([
    { $match: { userId: uidObj, counterId: cidObj } },
    { $group: { _id: null, total: { $sum: sumExpr } } }
  ]);

  const [dailyAgg] = await Event.aggregate([
    { $match: { userId: uidObj, counterId: cidObj, ts: { $gte: startOfToday } } },
    { $group: { _id: null, total: { $sum: sumExpr } } }
  ]);

  const total = Math.max(0, totalAgg?.total || 0);
  const daily = Math.max(0, dailyAgg?.total || 0);

  const lookbackDays = 90;
  const since = new Date(startOfToday);
  since.setDate(since.getDate() - (lookbackDays - 1));

  const byDay = await Event.aggregate([
    { $match: { userId: uidObj, counterId: cidObj, ts: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$ts' } }, sum: { $sum: sumExpr } } }
  ]);

  const dayMap = new Map(byDay.map(d => [d._id, d.sum || 0]));
  let streak = 0;
  for (let i = 0; i < lookbackDays; i++) {
    const d = new Date(startOfToday); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const val = Math.max(0, dayMap.get(key) || 0);
    if (val >= (counter.goalPerDay || 108)) streak++;
    else break;
  }

  await Counter.updateOne(
    { _id: cidObj, userId: uidObj },
    { $set: { total, daily, streak, updatedAt: new Date() } }
  );

  return { total, daily, streak, goalPerDay: counter.goalPerDay };
}

exports.getCounters = async (req, res, next) => {
  try {
    const counters = await Counter.find({ userId: getUserId(req) });
    res.json(counters);
  } catch (err) { next(err); }
};

exports.createCounter = async (req, res, next) => {
  try {
    const { name, goalPerDay } = req.body;
    const counter = await Counter.create({
      userId: getUserId(req),
      name: name || 'Radha Jaap',
      goalPerDay: goalPerDay || 108,
      total: 0, daily: 0, streak: 0
    });
    res.status(201).json(counter);
  } catch (err) { next(err); }
};

exports.updateCounter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, goalPerDay } = req.body;
    const counter = await Counter.findOneAndUpdate(
      { _id: id, userId: getUserId(req) },
      { $set: { ...(name && { name }), ...(goalPerDay && { goalPerDay }) } },
      { new: true }
    );
    if (!counter) return res.status(404).json({ error: 'Counter not found' });
    const calc = await recomputeCounter(getUserId(req), id);
    res.json({ ...counter.toObject(), total: calc.total, daily: calc.daily, streak: calc.streak });
  } catch (err) { next(err); }
};

exports.getSummary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const calc = await recomputeCounter(getUserId(req), id);
    res.json({
      total: calc.total,
      daily: calc.daily,
      streak: calc.streak,
      goalPerDay: calc.goalPerDay
    });
  } catch (err) { next(err); }
};

exports.syncEvents = async (req, res, next) => {
  try {
    const { events = [], sinceTs } = req.body;
    const uid = getUserId(req);

    const acceptedOpIds = [];
    const affected = new Set();

    for (const e of events) {
      try {
        await Event.create({
          userId: uid,
          counterId: e.counterId,
          opId: e.opId || uuidv4(),
          type: e.type,
          value: e.value || 1,
          ts: e.ts ? new Date(e.ts) : new Date()
        });
        acceptedOpIds.push(e.opId);
        if (e.counterId) affected.add(e.counterId);
      } catch {}
    }

    const summaries = await Promise.all([...affected].map(cid => recomputeCounter(uid, cid)));

    const query = { userId: uid };
    if (sinceTs) query.ts = { $gt: new Date(sinceTs) };
    const serverEvents = await Event.find(query).sort({ ts: 1 }).limit(500);

    res.json({
      acceptedOpIds,
      serverEvents,
      serverSinceTs: Date.now(),
      affected: summaries
    });
  } catch (err) { next(err); }
};
