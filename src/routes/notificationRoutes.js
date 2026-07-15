const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect); // Todas las rutas protegidas

router.get('/', notificationController.getNotifications);
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;
