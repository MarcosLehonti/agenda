const { GoogleGenerativeAI } = require('@google/generative-ai');
const taskService = require('../services/taskService');
const budgetService = require('../services/budgetService');

const chat = async (req, res, next) => {
  try {
    const { history, message } = req.body;
    const userId = req.user.id;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, text: 'Por favor escribe un mensaje para continuar.' });
    }

    // 1. Obtener tareas del usuario
    let compactTasks = [];
    try {
      const tasks = await taskService.getTasks(userId);
      compactTasks = tasks.map(t => {
        const taskObj = typeof t.toJSON === 'function' ? t.toJSON() : t;
        return {
          id: taskObj.id,
          title: taskObj.title,
          startTime: taskObj.startTime ? new Date(taskObj.startTime).toLocaleString('es-ES', { timeZone: 'America/La_Paz' }) : null,
          status: taskObj.status,
          priority: taskObj.priority
        };
      });
    } catch (e) {
      console.warn('Advertencia obteniendo tareas para contexto:', e.message);
    }

    // 2. Obtener resumen financiero del mes actual
    let compactFinances = { balanceDisponibleRestante: "0 Bs", categorias: [] };
    let finSummary = null;
    try {
      finSummary = await budgetService.getFinancialSummary(userId);
      compactFinances = {
        mes: finSummary.budget.month,
        presupuestoTotal: `${finSummary.totalBudget} ${finSummary.currency}`,
        totalAsignadoCategorias: `${finSummary.totalAllocated} ${finSummary.currency}`,
        totalGastado: `${finSummary.totalSpent} ${finSummary.currency}`,
        balanceDisponibleRestante: `${finSummary.remainingBudget} ${finSummary.currency}`,
        saldoSinAsignar: `${finSummary.unallocatedBudget} ${finSummary.currency}`,
        estadoBalance: finSummary.status,
        categorias: finSummary.categories.map(c => ({
          id: c.id,
          nombre: c.name,
          asignado: `${c.allocatedAmount} Bs`,
          gastado: `${c.spent} Bs`,
          disponibleEnCategoria: `${c.remaining} Bs`
        }))
      };
    } catch (e) {
      console.warn('Advertencia obteniendo finanzas para contexto:', e.message);
    }

    // Hora actual exacta (Zona Horaria Bolivia UTC-4)
    const now = new Date();
    const currentTimeStr = now.toLocaleString('es-ES', {
      timeZone: 'America/La_Paz'
    });
    const currentIsoDate = now.toISOString().slice(0, 10);

    const systemInstruction = `Eres Hovi, un asistente inteligente y empático de Agenda y Finanzas Personales.
Debes responder SIEMPRE en formato JSON válido estructurado con este esquema exacto:
{
  "action": "createTask" | "updateTaskStatus" | "rescheduleTask" | "setMonthlyBudget" | "createCategory" | "addExpense" | "chat",
  "params": {
    // Si action === "createTask":
    // "title": "Nombre de la tarea o actividad",
    // "startTime": "YYYY-MM-DDTHH:mm" (fecha y hora exacta en formato YYYY-MM-DDTHH:mm calculada en base a la fecha actual ${currentIsoDate} y la hora pedida),
    // "priority": "Baja" | "Media" | "Alta",
    // "description": "Detalles adicionales opcionales"

    // Si action === "updateTaskStatus":
    // "id": "id de la tarea",
    // "status": "Pendiente" | "En progreso" | "Completada"

    // Si action === "rescheduleTask":
    // "id": "id de la tarea",
    // "startTime": "YYYY-MM-DDTHH:mm"

    // Si action === "setMonthlyBudget":
    // "totalBudget": número en Bs,
    // "month": "YYYY-MM" (opcional)

    // Si action === "createCategory":
    // "name": "Nombre categoría",
    // "allocatedAmount": número en Bs,
    // "color": "#hex" (opcional)

    // Si action === "addExpense":
    // "amount": número en Bs gastado,
    // "description": "Detalle del gasto",
    // "categoryName": "Nombre de categoría si aplica"

    // Si action === "chat":
    // params puede ser {}
  },
  "message": "Tu respuesta conversacional con emojis para mostrarle al usuario."
}

SKILL 1: TAREAS (Agenda y Cronograma)
- Si el usuario pide agendar o crear una tarea o actividad (ej: "crea una actividad de wally hoy a las 17", "ir a entrenar mañana a las 8am"), usa action "createTask" y llena params con startTime calculado (ej: "${currentIsoDate}T17:00").
- Si no especifica la fecha, asume hoy (${currentIsoDate}).

SKILL 2: FINANZAS (Presupuesto Inteligente y Control de Gastos)
- Si el usuario dice que gastó dinero (ej: "gasté 20 Bs en cena", "pagué 10 Bs de pasaje"), usa action "addExpense".
- Si el usuario pregunta si PUEDE GASTAR en algo:
  1. Evalúa saldo en la categoría y balance disponible general (${compactFinances.balanceDisponibleRestante}).
  2. Responde con action "chat" y en "message" da una decisión clara al inicio: "✅ Sí, puedes gastar..." o "❌ No te lo recomiendo...".

DATOS EN TIEMPO REAL:
- Fecha/Hora actual (Bolivia): ${currentTimeStr}
- Fecha ISO hoy: ${currentIsoDate}
- Finanzas actuales del usuario:
${JSON.stringify(compactFinances, null, 1)}

- Tareas en agenda del usuario:
${JSON.stringify(compactTasks, null, 1)}
`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ 
        success: false, 
        text: 'La clave GEMINI_API_KEY no está configurada en el servidor.' 
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = [
      'gemini-3.1-flash-lite',
      'gemini-3.1-flash-lite-preview',
      'gemini-2.5-flash'
    ];

    // Sanitizar historial de chat para cumplir reglas estrictas de Gemini
    const rawHistory = Array.isArray(history) ? history : [];
    const validHistory = [];
    let expectedRole = 'user';

    for (const h of rawHistory) {
      if (h && h.role && Array.isArray(h.parts) && h.parts.length > 0 && h.parts[0].text) {
        const role = h.role === 'user' ? 'user' : 'model';
        if (role === expectedRole) {
          validHistory.push({
            role,
            parts: [{ text: String(h.parts[0].text) }]
          });
          expectedRole = expectedRole === 'user' ? 'model' : 'user';
        }
      }
    }

    if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
      validHistory.pop();
    }

    let result = null;
    let rawText = '';
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const jsonModel = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json' },
          systemInstruction
        });

        const chatSession = jsonModel.startChat({
          history: validHistory
        });

        result = await chatSession.sendMessage(message);
        rawText = result.response.text();
        if (rawText) break;
      } catch (err) {
        console.warn(`Aviso: Modelo ${modelName} no respondió (${err.message}), intentando alternativo...`);
        lastError = err;
        await new Promise(r => setTimeout(r, 400));
      }
    }

    if (!rawText) {
      throw lastError || new Error('No se pudo obtener respuesta del modelo JSON.');
    }

    let parsedData = {};

    try {
      parsedData = JSON.parse(rawText);
    } catch (parseErr) {
      console.warn('Aviso parseando JSON de Gemini:', parseErr.message);
      return res.status(200).json({ success: true, text: rawText });
    }

    const action = parsedData.action || 'chat';
    const params = parsedData.params || {};
    let finalMessage = parsedData.message || '¡Acción realizada con éxito!';

    // Ejecutar acciones en la base de datos según lo solicitado
    try {
      if (action === 'createTask') {
        let color = '#3b82f6';
        if (params.priority === 'Alta') color = '#ef4444';
        if (params.priority === 'Baja') color = '#22c55e';

        let startTime = params.startTime;
        if (!startTime) {
          const defaultTime = new Date();
          defaultTime.setHours(defaultTime.getHours() + 1, 0, 0, 0);
          startTime = defaultTime.toISOString().slice(0, 16);
        } else if (typeof startTime === 'string' && startTime.length === 5 && startTime.includes(':')) {
          startTime = `${currentIsoDate}T${startTime}`;
        }

        await taskService.createTask({
          title: params.title || 'Nueva Tarea',
          description: params.description || '',
          startTime: startTime,
          priority: params.priority || 'Media',
          color
        }, userId);

      } else if (action === 'updateTaskStatus' && params.id && params.status) {
        await taskService.updateTaskStatus(params.id, params.status, userId);

      } else if (action === 'rescheduleTask' && params.id && params.startTime) {
        await taskService.updateTask(params.id, { startTime: params.startTime }, userId);

      } else if (action === 'setMonthlyBudget' && params.totalBudget) {
        await budgetService.setTotalBudget(userId, params.month, Number(params.totalBudget));

      } else if (action === 'createCategory' && params.name && params.allocatedAmount) {
        await budgetService.createCategory(userId, {
          name: params.name,
          allocatedAmount: Number(params.allocatedAmount),
          color: params.color || '#3b82f6'
        });

      } else if (action === 'addExpense' && params.amount) {
        let categoryId = null;
        if (finSummary && Array.isArray(finSummary.categories) && params.categoryName) {
          const matchedCategory = finSummary.categories.find(c => 
            c.name.toLowerCase().includes(params.categoryName.toLowerCase()) ||
            params.categoryName.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matchedCategory) {
            categoryId = matchedCategory.id;
          }
        }

        await budgetService.addExpense(userId, {
          categoryId,
          amount: Number(params.amount),
          description: params.description || 'Gasto registrado por Asistente'
        });
      }
    } catch (dbErr) {
      console.error('Error ejecutando acción en base de datos:', dbErr);
      return res.status(200).json({
        success: true,
        text: `❌ Hubo un inconveniente al guardar los datos: ${dbErr.message}`
      });
    }

    return res.status(200).json({
      success: true,
      text: finalMessage
    });
  } catch (error) {
    console.error('Error general en Gemini Chat Controller:', error);
    return res.status(200).json({
      success: true,
      text: 'Ocurrió una intermitencia con el servidor del asistente. Por favor intenta de nuevo.'
    });
  }
};

module.exports = {
  chat
};



