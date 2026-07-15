const cron = require('node-cron');
const { Op } = require('sequelize');
const { Task, Notification } = require('../models');

const startCron = () => {
  console.log('Cron job de notificaciones iniciado. Revisando cada minuto...');
  
  // Ejecutar cada minuto
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const in31Mins = new Date(now.getTime() + 31 * 60000); // Ventana de 31 mins

      // Buscar tareas pendientes que comiencen en los próximos 31 minutos
      const tasks = await Task.findAll({
        where: {
          startTime: {
            [Op.between]: [now, in31Mins]
          },
          status: {
            [Op.ne]: 'Completada'
          }
        }
      });

      for (const task of tasks) {
        // Verificar si ya notificamos esta tarea
        const existingNotification = await Notification.findOne({
          where: { taskId: task.id }
        });

        if (!existingNotification) {
          const timeString = new Date(task.startTime).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          });

          await Notification.create({
            userId: task.userId,
            taskId: task.id,
            message: `Próxima tarea a las ${timeString}: ${task.title}. ¡Vete preparando!`
          });
        }
      }
    } catch (error) {
      console.error('Error en el cron de notificaciones:', error);
    }
  });
};

module.exports = { startCron };
