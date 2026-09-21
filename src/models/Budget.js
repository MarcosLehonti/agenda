const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Budget = sequelize.define('Budget', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  month: {
    type: DataTypes.STRING(7), // Formato 'YYYY-MM' e.g. '2026-09'
    allowNull: false,
  },
  totalBudget: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'Bs',
  }
}, {
  timestamps: true,
  tableName: 'budgets',
  indexes: [
    {
      unique: true,
      fields: ['userId', 'month']
    }
  ]
});

module.exports = Budget;
