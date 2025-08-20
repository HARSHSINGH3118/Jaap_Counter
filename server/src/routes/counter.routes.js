const { Router } = require('express');
const router = Router();

const {
  getCounters,
  createCounter,
  updateCounter,
  getSummary,
  syncEvents
} = require('../controllers/counter.controller');

const requireAuth = require('../middleware/auth');

router.use(requireAuth);

router.get('/', getCounters);
router.post('/', createCounter);
router.patch('/:id', updateCounter);
router.get('/:id/summary', getSummary);
router.post('/sync', syncEvents);

module.exports = router;
