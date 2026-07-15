const { Notification } = require('../models');

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50 // Traer las últimas 50
    });
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({
      where: { id, userId: req.user.id }
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead
};
