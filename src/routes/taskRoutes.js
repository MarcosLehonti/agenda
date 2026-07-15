const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { protect } = require('../middlewares/authMiddleware');

// Todas las rutas de tareas están protegidas
router.use(protect);

router.route('/')
  .get(taskController.getTasks)
  .post(taskController.createTask);

router.route('/:id')
  .get(taskController.getTaskById)
  .put(taskController.updateTask)
  .delete(taskController.deleteTask);

router.patch('/:id/status', taskController.updateTaskStatus);

module.exports = router;
