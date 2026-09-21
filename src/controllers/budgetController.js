const budgetService = require('../services/budgetService');

const getSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month } = req.query;
    const summary = await budgetService.getFinancialSummary(userId, month);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

const setTotalBudget = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month, totalBudget } = req.body;
    const budget = await budgetService.setTotalBudget(userId, month, totalBudget);
    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month, name, allocatedAmount, color, icon } = req.body;
    const category = await budgetService.createCategory(userId, { month, name, allocatedAmount, color, icon });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const category = await budgetService.updateCategory(userId, id, req.body);
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await budgetService.deleteCategory(userId, id);
    res.status(200).json({ success: true, message: 'Categoría eliminada' });
  } catch (error) {
    next(error);
  }
};

const addExpense = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { categoryId, amount, description, date } = req.body;
    const expense = await budgetService.addExpense(userId, { categoryId, amount, description, date });
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

const getExpenses = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month } = req.query;
    const expenses = await budgetService.getExpenses(userId, month);
    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await budgetService.deleteExpense(userId, id);
    res.status(200).json({ success: true, message: 'Gasto eliminado' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  setTotalBudget,
  createCategory,
  updateCategory,
  deleteCategory,
  addExpense,
  getExpenses,
  deleteExpense
};
