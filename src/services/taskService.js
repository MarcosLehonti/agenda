const { Task } = require('../models');

const getTasks = async (userId) => {
  return await Task.findAll({
    where: { userId },
    order: [['startTime', 'ASC']]
  });
};

const getTaskById = async (id, userId) => {
  const task = await Task.findOne({ where: { id, userId } });
  if (!task) {
    throw new Error('Tarea no encontrada');
  }
  return task;
};

const appendTimezone = (dateStr) => {
  if (typeof dateStr === 'string' && dateStr.length === 16) {
    return `${dateStr}:00-04:00`;
  }
  return dateStr;
};

const createTask = async (taskData, userId) => {
  if (taskData.startTime) taskData.startTime = appendTimezone(taskData.startTime);
  if (taskData.endTime) taskData.endTime = appendTimezone(taskData.endTime);

  return await Task.create({
    ...taskData,
    userId
  });
};

const updateTask = async (id, taskData, userId) => {
  const task = await getTaskById(id, userId);
  
  if (taskData.startTime) taskData.startTime = appendTimezone(taskData.startTime);
  if (taskData.endTime) taskData.endTime = appendTimezone(taskData.endTime);
  
  await task.update(taskData);
  return task;
};

const updateTaskStatus = async (id, status, userId) => {
  const task = await getTaskById(id, userId);
  
  task.status = status;
  await task.save();
  
  return task;
};

const deleteTask = async (id, userId) => {
  const task = await getTaskById(id, userId);
  
  await task.destroy();
  return { id };
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask
};
