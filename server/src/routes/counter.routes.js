const { Router } = require('express');
const router = Router();

const {
  getCounters,
  createCounter,
  updateCounter,
  getSummary,
  syncEvents
} = require('../controllers/counter.controller');

const auth = require('../middleware/auth');

router.use(auth); // protect everything below

router.get('/', getCounters);
router.post('/', createCounter);
router.patch('/:id', updateCounter);
router.get('/:id/summary', getSummary);
router.post('/sync', syncEvents);

module.exports = router;
