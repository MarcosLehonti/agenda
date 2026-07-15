const taskService = require('../services/taskService');

const getTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getTasks(req.user.id);
    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id, req.user.id);
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    if (error.message === 'Tarea no encontrada') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.body, req.user.id);
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.body, req.user.id);
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    if (error.message === 'Tarea no encontrada') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const task = await taskService.updateTaskStatus(req.params.id, status, req.user.id);
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    if (error.message === 'Tarea no encontrada') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    await taskService.deleteTask(req.params.id, req.user.id);
    res.status(200).json({ success: true, message: 'Tarea eliminada' });
  } catch (error) {
    if (error.message === 'Tarea no encontrada') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask
};
