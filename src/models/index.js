const User = require('./User');
const Task = require('./Task');
const Notification = require('./Notification');

// Associations
User.hasMany(Task, {
  foreignKey: 'userId',
  as: 'tasks',
  onDelete: 'CASCADE'
});

Task.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Notification associations
User.hasMany(Notification, {
  foreignKey: 'userId',
  as: 'notifications',
  onDelete: 'CASCADE'
});

Notification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Task.hasMany(Notification, {
  foreignKey: 'taskId',
  as: 'notifications',
  onDelete: 'CASCADE'
});

Notification.belongsTo(Task, {
  foreignKey: 'taskId',
  as: 'task'
});

module.exports = {
  User,
  Task,
  Notification
};
