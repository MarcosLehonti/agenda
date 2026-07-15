const { GoogleGenerativeAI } = require('@google/generative-ai');
const taskService = require('../services/taskService');

const functionDeclarations = [
  {
    name: "createTask",
    description: "Crea una nueva tarea en la agenda del usuario. Úsalo cuando el usuario te pida explícitamente agregar o programar algo nuevo.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Título breve de la tarea" },
        description: { type: "STRING", description: "Detalles adicionales" },
        startTime: { type: "STRING", description: "Fecha y hora en formato YYYY-MM-DDTHH:mm (Ejemplo: 2026-07-15T15:30)" },
        priority: { type: "STRING", description: "Prioridad: Baja, Media, o Alta", enum: ["Baja", "Media", "Alta"] }
      },
      required: ["title", "startTime"]
    }
  },
  {
    name: "updateTaskStatus",
    description: "Cambia el estado de una tarea (ej. marcarla como completada).",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "STRING", description: "El ID de la tarea" },
        status: { type: "STRING", description: "El nuevo estado: Pendiente, En progreso, Completada", enum: ["Pendiente", "En progreso", "Completada"] }
      },
      required: ["id", "status"]
    }
  },
  {
    name: "rescheduleTask",
    description: "Cambia la fecha/hora de una tarea existente o la reprograma para otro día.",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "STRING", description: "El ID de la tarea" },
        startTime: { type: "STRING", description: "La nueva fecha y hora en formato YYYY-MM-DDTHH:mm" }
      },
      required: ["id", "startTime"]
    }
  }
];

const chat = async (req, res, next) => {
  try {
    const { history, message } = req.body;
    const userId = req.user.id;

    // Obtener las tareas reales del usuario
    const tasks = await taskService.getTasks(userId);
    
    // Formatear las fechas para que la IA las lea en hora local
    const formattedTasks = tasks.map(t => {
      const taskObj = typeof t.toJSON === 'function' ? t.toJSON() : t;
      if (taskObj.startTime) {
        taskObj.startTime = new Date(taskObj.startTime).toLocaleString('es-ES', {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
      }
      if (taskObj.endTime) {
        taskObj.endTime = new Date(taskObj.endTime).toLocaleString('es-ES', {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
      }
      return taskObj;
    });

    const tasksJson = JSON.stringify(formattedTasks, null, 2);
    
    // Obtenemos la hora actual exacta
    const now = new Date();
    const currentTimeStr = now.toLocaleString('es-ES', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    // Inicializar Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite', // Asegúrate de usar un modelo que soporte function calling
      tools: [{ functionDeclarations }],
      systemInstruction: `Eres Hovi, un asistente inteligente de la Agenda Inteligente. 
Tu rol es ayudar al usuario a gestionar y organizar sus tareas.

INFORMACIÓN DE CONTEXTO OBLIGATORIA:
- La fecha y hora ACTUAL EXACTA es: ${currentTimeStr}
- Tienes que responder estrictamente de acuerdo a la TAREA y al CONTEXTO de la pregunta. Por ejemplo, si el usuario pregunta qué cenar y tiene una tarea de entrenar voley pronto, recomiéndale algo ligero basándote en que hará deporte. Si la tarea es estudiar, recomiéndale algo para la concentración. Si la tarea es dormir, algo que no sea pesado, etc.
- Evalúa el tiempo. Si el usuario quiere hacer algo ahora pero tiene una tarea en 30 minutos (ej. lavar la ropa), y lo que quiere hacer toma más tiempo (ej. ir al mercado), dile de forma amable que no le dará tiempo.

Tus tareas actuales en la base de datos son:
${tasksJson}

ACCIONES DISPONIBLES (Herramientas):
Puedes ejecutar acciones directas si el usuario te lo pide explícitamente (ej. "crea una tarea", "marca como completada la tarea de lavar", "reprograma esto para las 5pm"). 
Si llamas a una herramienta, yo ejecutaré la acción y te daré el resultado para que se lo confirmes al usuario.

Responde siempre en español, sé proactivo, amable y servicial.`
    });

    const chatSession = model.startChat({
      history: history || [],
    });

    // Enviar el mensaje del usuario
    const result = await chatSession.sendMessage(message);
    const response = result.response;
    
    // Verificar si Gemini quiere llamar a una función
    const calls = response.functionCalls();
    
    if (calls && calls.length > 0) {
      const call = calls[0]; // Procesamos la primera función que pida
      let functionResult = {};
      
      console.log('Gemini quiere ejecutar:', call.name, call.args);
      
      try {
        if (call.name === 'createTask') {
          let color = '#3b82f6';
          if (call.args.priority === 'Alta') color = '#ef4444';
          if (call.args.priority === 'Baja') color = '#22c55e';
          
          await taskService.createTask({
            title: call.args.title,
            description: call.args.description,
            startTime: call.args.startTime,
            priority: call.args.priority || 'Media',
            color
          }, userId);
          functionResult = { status: "Success", result: `Tarea '${call.args.title}' creada exitosamente.` };
          
        } else if (call.name === 'updateTaskStatus') {
          await taskService.updateTaskStatus(call.args.id, call.args.status, userId);
          functionResult = { status: "Success", result: `Estado actualizado a ${call.args.status}.` };
          
        } else if (call.name === 'rescheduleTask') {
          await taskService.updateTask(call.args.id, { startTime: call.args.startTime }, userId);
          functionResult = { status: "Success", result: `Tarea reprogramada a ${call.args.startTime}.` };
        }
      } catch (err) {
        functionResult = { status: "Error", error: err.message };
      }

      // Enviar el resultado de la función de vuelta a Gemini para que genere la respuesta final en texto
      const funcResponseResult = await chatSession.sendMessage([{
        functionResponse: {
          name: call.name,
          response: functionResult
        }
      }]);
      
      return res.status(200).json({ success: true, text: funcResponseResult.response.text() });
    }

    // Si no llamó a ninguna función, respondemos normalmente
    res.status(200).json({ success: true, text: response.text() });
  } catch (error) {
    console.error('Error en Gemini:', error);
    next(error);
  }
};

module.exports = {
  chat
};
