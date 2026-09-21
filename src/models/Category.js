const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  budgetId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  allocatedAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: '#3b82f6',
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'tag',
  }
}, {
  timestamps: true,
  tableName: 'categories'
});

module.exports = Category;
