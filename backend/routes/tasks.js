const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

router.get('/my-tasks', taskController.getMyTasks);

router.route('/')
  .get(taskController.getAllTasks)
  .post(taskController.createTask);

router.route('/:id')
  .get(taskController.getTaskById)
  .put(taskController.updateTask)
  .delete(taskController.deleteTask);

router.post('/:id/complete', taskController.submitCompletionNotes);
router.patch('/:taskId/checklist/:itemId', taskController.updateChecklistItem);

module.exports = router;

