const Task = require('../models/Task');

// Create task (automatically sets creator)
exports.createTask = async (req, res) => {
  try {
    const { title, description, budget, deadline } = req.body;
    
    const task = await Task.create({
      title,
      description,
      budget,
      deadline,
      createdBy: req.user.id
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all tasks
exports.getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('createdBy', 'username avatar')
      .populate('claimedBy', 'username avatar');
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Claim a task
exports.claimTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (task.createdBy.equals(req.user.id)) {
      return res.status(400).json({ error: 'Cannot claim your own task' });
    }
    
    if (task.isClaimed) {
      return res.status(400).json({ error: 'Task already claimed' });
    }

    task.claimedBy = req.user.id;
    task.isClaimed = true;
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Unclaim a task
exports.unclaimTask = async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      if (!task.isClaimed) {
        return res.status(400).json({ error: 'Task is not claimed' });
      }
  
      if (!task.claimedBy.equals(req.user.id)) {
        return res.status(403).json({ error: 'You did not claim this task' });
      }
  
      task.claimedBy = undefined;
      task.isClaimed = false;
      await task.save();
  
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  

// Get my tasks (created or claimed)
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      $or: [
        { createdBy: req.user.id },
        { claimedBy: req.user.id }
      ]
    })
    .populate('createdBy', 'username avatar')
    .populate('claimedBy', 'username avatar');

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a task (only creator can delete)
exports.deleteTask = async (req, res) => {
    try {
      const task = await Task.findOneAndDelete({
        _id: req.params.id,
        createdBy: req.user.id // Only creator can delete
      });
  
      if (!task) {
        return res.status(404).json({ 
          error: 'Task not found or you are not the creator' 
        });
      }
  
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };