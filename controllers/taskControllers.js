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

exports.getAllTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'username avatar')
        .populate('claimedBy', 'username avatar'),
      Task.countDocuments()
    ]);

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get my tasks with pagination
exports.getMyTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find({
        $or: [
          { createdBy: req.user.id },
          { claimedBy: req.user.id }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'username avatar')
      .populate('claimedBy', 'username avatar'),
      Task.countDocuments({
        $or: [
          { createdBy: req.user.id },
          { claimedBy: req.user.id }
        ]
      })
    ]);

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
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