const User = require('./User');
const Task = require('./Task');
const Notification = require('./Notification');
const Budget = require('./Budget');
const Category = require('./Category');
const Expense = require('./Expense');

// User - Task Associations
User.hasMany(Task, {
  foreignKey: 'userId',
  as: 'tasks',
  onDelete: 'CASCADE'
});

Task.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// User - Notification associations
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

// User - Budget associations
User.hasMany(Budget, {
  foreignKey: 'userId',
  as: 'budgets',
  onDelete: 'CASCADE'
});

Budget.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Budget - Category associations
Budget.hasMany(Category, {
  foreignKey: 'budgetId',
  as: 'categories',
  onDelete: 'CASCADE'
});

Category.belongsTo(Budget, {
  foreignKey: 'budgetId',
  as: 'budget'
});

User.hasMany(Category, {
  foreignKey: 'userId',
  as: 'categories',
  onDelete: 'CASCADE'
});

Category.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Category - Expense associations
Category.hasMany(Expense, {
  foreignKey: 'categoryId',
  as: 'expenses',
  onDelete: 'SET NULL'
});

Expense.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category'
});

User.hasMany(Expense, {
  foreignKey: 'userId',
  as: 'expenses',
  onDelete: 'CASCADE'
});

Expense.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

module.exports = {
  User,
  Task,
  Notification,
  Budget,
  Category,
  Expense
};
