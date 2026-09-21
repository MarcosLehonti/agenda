const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/summary', budgetController.getSummary);
router.post('/total', budgetController.setTotalBudget);

router.post('/categories', budgetController.createCategory);
router.put('/categories/:id', budgetController.updateCategory);
router.delete('/categories/:id', budgetController.deleteCategory);

router.get('/expenses', budgetController.getExpenses);
router.post('/expenses', budgetController.addExpense);
router.delete('/expenses/:id', budgetController.deleteExpense);

module.exports = router;
