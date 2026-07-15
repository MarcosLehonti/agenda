const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/chat', aiController.chat);

module.exports = router;
