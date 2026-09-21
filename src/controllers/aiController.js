const { GoogleGenerativeAI } = require('@google/generative-ai');
const taskService = require('../services/taskService');
const budgetService = require('../services/budgetService');

const functionDeclarations = [
  // --- SKILL: TAREAS ---
  {
    name: "createTask",
    description: "Crea una nueva tarea en la agenda del usuario.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Título breve de la tarea" },
        description: { type: "STRING", description: "Detalles adicionales" },
        startTime: { type: "STRING", description: "Fecha y hora en formato YYYY-MM-DDTHH:mm (Ej: 2026-09-21T18:00)" },
        priority: { type: "STRING", description: "Prioridad: Baja, Media, o Alta", enum: ["Baja", "Media", "Alta"] }
      },
      required: ["title", "startTime"]
    }
  },
  {
    name: "updateTaskStatus",
    description: "Cambia el estado de una tarea (ej. marcarla como completada o pendiente).",
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
    description: "Cambia la fecha/hora de una tarea existente.",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "STRING", description: "El ID de la tarea" },
        startTime: { type: "STRING", description: "La nueva fecha y hora en formato YYYY-MM-DDTHH:mm" }
      },
      required: ["id", "startTime"]
    }
  },

  // --- SKILL: FINANZAS ---
  {
    name: "setMonthlyBudget",
    description: "Establece o actualiza el presupuesto total del mes para el usuario.",
    parameters: {
      type: "OBJECT",
      properties: {
        totalBudget: { type: "NUMBER", description: "Monto total en Bs asignado para el mes" },
        month: { type: "STRING", description: "Mes en formato YYYY-MM (opcional, por defecto el mes actual)" }
      },
      required: ["totalBudget"]
    }
  },
  {
    name: "createCategory",
    description: "Crea una nueva categoría de gastos con su monto asignado.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Nombre de la categoría (ej: Comida, Pasajes, Ocio, Gimnasio)" },
        allocatedAmount: { type: "NUMBER", description: "Monto en Bs asignado a esta categoría" },
        color: { type: "STRING", description: "Color hexadecimal opcional (ej: #ef4444, #10b981)" }
      },
      required: ["name", "allocatedAmount"]
    }
  },
  {
    name: "addExpense",
    description: "Registra un gasto realizado en una categoría específica.",
    parameters: {
      type: "OBJECT",
      properties: {
        amount: { type: "NUMBER", description: "Monto en Bs gastado" },
        description: { type: "STRING", description: "Detalle del gasto (ej: Cena rápida, Pasajes trufi, Almuerzo)" },
        categoryName: { type: "STRING", description: "Nombre de la categoría a la que pertenece el gasto" }
      },
      required: ["amount", "description"]
    }
  }
];

const chat = async (req, res, next) => {
  try {
    const { history, message, activeSkill } = req.body;
    const userId = req.user.id;

    // 1. Obtener tareas del usuario (optimizado: sólo campos necesarios)
    const tasks = await taskService.getTasks(userId);
    const compactTasks = tasks.map(t => {
      const taskObj = typeof t.toJSON === 'function' ? t.toJSON() : t;
      return {
        id: taskObj.id,
        title: taskObj.title,
        startTime: taskObj.startTime ? new Date(taskObj.startTime).toLocaleString('es-ES', { timeZone: 'America/La_Paz' }) : null,
        status: taskObj.status,
        priority: taskObj.priority
      };
    });

    // 2. Obtener resumen financiero del mes actual (optimizado)
    const finSummary = await budgetService.getFinancialSummary(userId);
    const compactFinances = {
      mes: finSummary.budget.month,
      presupuestoTotal: `${finSummary.totalBudget} ${finSummary.currency}`,
      totalAsignadoCategorias: `${finSummary.totalAllocated} ${finSummary.currency}`,
      totalGastado: `${finSummary.totalSpent} ${finSummary.currency}`,
      balanceDisponibleRestante: `${finSummary.remainingBudget} ${finSummary.currency}`,
      saldoSinAsignar: `${finSummary.unallocatedBudget} ${finSummary.currency}`,
      estadoBalance: finSummary.status, // 'positive', 'negative', 'zero'
      categorias: finSummary.categories.map(c => ({
        id: c.id,
        nombre: c.name,
        asignado: `${c.allocatedAmount} Bs`,
        gastado: `${c.spent} Bs`,
        disponibleEnCategoria: `${c.remaining} Bs`
      }))
    };

    // Hora actual exacta
    const now = new Date();
    const currentTimeStr = now.toLocaleString('es-ES', {
      timeZone: 'America/La_Paz'
    });

    // Instrucciones del sistema estructuradas por Skills y ultra-optimizadas
    const systemInstruction = `Eres Hovi, un asistente inteligente de Agenda y Finanzas Personales.
Operas con 2 Skills principales conectadas entre sí:

SKILL 1: TAREAS (Agenda y Cronograma)
- Gestionas el tiempo, citas y pendientes del usuario.
- Si el usuario menciona actividades (ej. ir a entrenar, salir a comer, estudiar), analiza tiempos y necesidades asociadas.

SKILL 2: FINANZAS (Presupuesto Inteligente y Control de Gastos)
- Gestionas el presupuesto mensual y categorías dinámicas.
- Si el usuario pregunta si PUEDE GASTAR en algo (ej: "¿Puedo gastar 20 Bs en una cena hoy?"):
  1. Identifica a qué categoría pertenece (ej: "Comida").
  2. Evalúa el saldo disponible en esa categoría y el balance general restante (${compactFinances.balanceDisponibleRestante}).
  3. Revisa la agenda de hoy: si tiene actividades pendientes que requieran dinero (ej. transporte/pasajes), tómalo en cuenta.
  4. Responde SIEMPRE con una DECISIÓN CLARA al inicio:
     • "✅ Sí, puedes gastar [monto] Bs..." (si hay presupuesto suficiente en la categoría y total).
     • "❌ No es recomendable / No tienes presupuesto suficiente..." (si excede la categoría o dejaría el balance en rojo).
  5. Muestra cuánto saldo le quedaría en esa categoría tras el gasto.
  6. Da un consejo proactivo breve de ahorro ("💡 Tip de ahorro: ...").

SINCRONIZACIÓN TAREAS + FINANZAS:
- Si el usuario tiene una tarea (ej: ir al gimnasio/entrenamiento/clases), adviértele que necesitará dinero para pasajes o viáticos (ej. 10 Bs) antes de gastar su dinero disponible.
- Sé empático, directo, proactivo y muy claro.

DATOS EN TIEMPO REAL:
- Fecha/Hora actual: ${currentTimeStr}
- Finanzas actuales del usuario:
${JSON.stringify(compactFinances, null, 1)}

- Tareas en agenda del usuario:
${JSON.stringify(compactTasks, null, 1)}
`;

    // Inicializar Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      tools: [{ functionDeclarations }],
      systemInstruction
    });

    const chatSession = model.startChat({
      history: history || [],
    });

    const result = await chatSession.sendMessage(message);
    const response = result.response;
    const calls = response.functionCalls();

    if (calls && calls.length > 0) {
      const call = calls[0];
      let functionResult = {};

      console.log('Gemini ejecuta función:', call.name, call.args);

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

        } else if (call.name === 'setMonthlyBudget') {
          await budgetService.setTotalBudget(userId, call.args.month, call.args.totalBudget);
          functionResult = { status: "Success", result: `Presupuesto mensual establecido en ${call.args.totalBudget} Bs.` };

        } else if (call.name === 'createCategory') {
          await budgetService.createCategory(userId, {
            name: call.args.name,
            allocatedAmount: call.args.allocatedAmount,
            color: call.args.color
          });
          functionResult = { status: "Success", result: `Categoría '${call.args.name}' creada con ${call.args.allocatedAmount} Bs asignados.` };

        } else if (call.name === 'addExpense') {
          // Buscar categoría por nombre si existe
          let categoryId = null;
          if (call.args.categoryName) {
            const matchedCategory = finSummary.categories.find(c => 
              c.name.toLowerCase().includes(call.args.categoryName.toLowerCase()) ||
              call.args.categoryName.toLowerCase().includes(c.name.toLowerCase())
            );
            if (matchedCategory) categoryId = matchedCategory.id;
          }

          await budgetService.addExpense(userId, {
            categoryId,
            amount: call.args.amount,
            description: call.args.description
          });
          functionResult = { status: "Success", result: `Gasto de ${call.args.amount} Bs registrado en ${call.args.categoryName || 'General'}.` };
        }
      } catch (err) {
        functionResult = { status: "Error", error: err.message };
      }

      const funcResponseResult = await chatSession.sendMessage([{
        functionResponse: {
          name: call.name,
          response: functionResult
        }
      }]);

      return res.status(200).json({ success: true, text: funcResponseResult.response.text() });
    }

    res.status(200).json({ success: true, text: response.text() });
  } catch (error) {
    console.error('Error en Gemini:', error);
    next(error);
  }
};

module.exports = {
  chat
};
