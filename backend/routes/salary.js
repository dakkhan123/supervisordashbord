const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');

router.get('/my-salary', salaryController.getMySalaries);
router.get('/calculate', salaryController.calculateSalary);
router.post('/set-monthly-salary', salaryController.setMonthlySalary);
router.post('/overtime', salaryController.approveOvertime);
router.get('/overtime', salaryController.getOvertimeHistory);
router.get('/history', salaryController.getSalaryHistory);

router.route('/')
  .get(salaryController.getAllSalaries)
  .post(salaryController.createSalary);

router.route('/:id')
  .get(salaryController.getSalaryById)
  .put(salaryController.updateSalary)
  .delete(salaryController.deleteSalary);

module.exports = router;
