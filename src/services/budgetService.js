const { Budget, Category, Expense } = require('../models');
const { Op } = require('sequelize');

const getCurrentMonthString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getOrCreateBudget = async (userId, month) => {
  const targetMonth = month || getCurrentMonthString();
  let budget = await Budget.findOne({
    where: { userId, month: targetMonth }
  });

  if (!budget) {
    budget = await Budget.create({
      userId,
      month: targetMonth,
      totalBudget: 0,
      currency: 'Bs'
    });
  }

  return budget;
};

const getFinancialSummary = async (userId, month) => {
  const targetMonth = month || getCurrentMonthString();
  const budget = await getOrCreateBudget(userId, targetMonth);

  // Obtener categorías del presupuesto
  const categories = await Category.findAll({
    where: { budgetId: budget.id, userId },
    order: [['createdAt', 'ASC']]
  });

  // Obtener rango del mes para gastos
  const [yearStr, monthStr] = targetMonth.split('-');
  const startOfMonth = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
  const endOfMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0, 23, 59, 59, 999);

  const expenses = await Expense.findAll({
    where: {
      userId,
      date: {
        [Op.between]: [startOfMonth, endOfMonth]
      }
    },
    include: [{ model: Category, as: 'category' }],
    order: [['date', 'DESC'], ['createdAt', 'DESC']]
  });

  // Calcular totales
  let totalAllocated = 0;
  let totalSpent = 0;

  const categoriesWithStats = categories.map((cat) => {
    const catJson = cat.toJSON();
    const catExpenses = expenses.filter(e => e.categoryId === cat.id);
    const spent = catExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const remaining = Number(catJson.allocatedAmount || 0) - spent;
    
    totalAllocated += Number(catJson.allocatedAmount || 0);

    return {
      ...catJson,
      spent,
      remaining,
      percentageSpent: catJson.allocatedAmount > 0 
        ? Math.min(100, Math.round((spent / catJson.allocatedAmount) * 100))
        : 0
    };
  });

  totalSpent = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  
  // Balance según presupuesto vs asignado y presupuesto vs gastado
  const unallocatedBudget = Number(budget.totalBudget) - totalAllocated;
  const remainingBudget = Number(budget.totalBudget) - totalSpent;

  return {
    budget: budget.toJSON(),
    categories: categoriesWithStats,
    expenses: expenses.map(e => e.toJSON()),
    totalBudget: Number(budget.totalBudget),
    totalAllocated,
    totalSpent,
    unallocatedBudget,
    remainingBudget,
    currency: budget.currency || 'Bs',
    status: remainingBudget < 0 ? 'negative' : (remainingBudget > 0 ? 'positive' : 'zero')
  };
};

const setTotalBudget = async (userId, month, totalBudget) => {
  const budget = await getOrCreateBudget(userId, month);
  budget.totalBudget = Number(totalBudget);
  await budget.save();
  return budget;
};

const createCategory = async (userId, { month, name, allocatedAmount, color, icon }) => {
  const budget = await getOrCreateBudget(userId, month);
  const category = await Category.create({
    userId,
    budgetId: budget.id,
    name,
    allocatedAmount: Number(allocatedAmount || 0),
    color: color || '#3b82f6',
    icon: icon || 'tag'
  });
  return category;
};

const updateCategory = async (userId, categoryId, data) => {
  const category = await Category.findOne({
    where: { id: categoryId, userId }
  });
  if (!category) {
    throw new Error('Categoría no encontrada');
  }

  if (data.name !== undefined) category.name = data.name;
  if (data.allocatedAmount !== undefined) category.allocatedAmount = Number(data.allocatedAmount);
  if (data.color !== undefined) category.color = data.color;
  if (data.icon !== undefined) category.icon = data.icon;

  await category.save();
  return category;
};

const deleteCategory = async (userId, categoryId) => {
  const category = await Category.findOne({
    where: { id: categoryId, userId }
  });
  if (!category) {
    throw new Error('Categoría no encontrada');
  }
  await category.destroy();
  return { success: true };
};

const addExpense = async (userId, { categoryId, amount, description, date }) => {
  const expense = await Expense.create({
    userId,
    categoryId: categoryId || null,
    amount: Number(amount),
    description: description || 'Gasto sin descripción',
    date: date ? new Date(date) : new Date()
  });

  return expense;
};

const getExpenses = async (userId, month) => {
  const targetMonth = month || getCurrentMonthString();
  const [yearStr, monthStr] = targetMonth.split('-');
  const startOfMonth = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
  const endOfMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0, 23, 59, 59, 999);

  return await Expense.findAll({
    where: {
      userId,
      date: {
        [Op.between]: [startOfMonth, endOfMonth]
      }
    },
    include: [{ model: Category, as: 'category' }],
    order: [['date', 'DESC'], ['createdAt', 'DESC']]
  });
};

const deleteExpense = async (userId, expenseId) => {
  const expense = await Expense.findOne({
    where: { id: expenseId, userId }
  });
  if (!expense) {
    throw new Error('Gasto no encontrado');
  }
  await expense.destroy();
  return { success: true };
};

module.exports = {
  getCurrentMonthString,
  getOrCreateBudget,
  getFinancialSummary,
  setTotalBudget,
  createCategory,
  updateCategory,
  deleteCategory,
  addExpense,
  getExpenses,
  deleteExpense
};
