const express = require('express');
const router = express.Router();
const { 
  createTask, 
  getAllTasks, 
  claimTask, 
  getMyTasks, 
  deleteTask,
  unclaimTask
} = require('../controllers/taskControllers');
const { protect } = require('../middleware/auth');

router.use(protect); // Protect all task routes

router.post('/', createTask);
router.get('/', getAllTasks);
router.get('/my-tasks', getMyTasks);
router.post('/:id/claim', claimTask);
router.post('/:id/unclaim', unclaimTask);
router.delete('/:id', deleteTask);

module.exports = router;