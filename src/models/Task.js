const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('Pendiente', 'En progreso', 'Completada'),
    defaultValue: 'Pendiente',
  },
  priority: {
    type: DataTypes.ENUM('Baja', 'Media', 'Alta'),
    defaultValue: 'Media',
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: '#3b82f6', // blue-500 por defecto
  },
}, {
  timestamps: true,
  tableName: 'tasks'
});

module.exports = Task;
