const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');

router.get('/my-salary', salaryController.getMySalaries);

router.route('/')
  .get(salaryController.getAllSalaries)
  .post(salaryController.createSalary);


router.route('/calculate')
  .get(salaryController.calculateSalary);

router.route('/:id')
  .get(salaryController.getSalaryById)
  .put(salaryController.updateSalary)
  .delete(salaryController.deleteSalary);

module.exports = router;
