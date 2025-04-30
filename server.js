require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();

// CORS setup
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://centric-task.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Database connection status tracking
let isDBConnected = false;

mongoose.connection.on('connected', () => {
  isDBConnected = true;
  console.log("✅ MongoDB connected!");
});

mongoose.connection.on('error', (err) => {
  isDBConnected = false;
  console.error("❌ MongoDB connection error:", err);
});

mongoose.connection.on('disconnected', () => {
  isDBConnected = false;
  console.log("ℹ️ MongoDB disconnected");
});

const connectDB = async () => {
  try {
    // Explicitly create connection
    await mongoose.createConnection(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000
    }).asPromise();
    
    console.log("✅ MongoDB connected!");
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    // More detailed error logging
    console.log("Connection details:", {
      host: error.host,
      reason: error.reason ? error.reason : 'No additional error info'
    });
    return false;
  }
};

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// Enhanced root endpoint
app.get("/", (req, res) => {
  const status = {
    api: "running",
    database: isDBConnected ? "connected" : "not connected",
    timestamp: new Date().toISOString()
  };
  res.json(status);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: isDBConnected ? "healthy" : "unhealthy",
    database: isDBConnected ? "connected" : "disconnected",
    uptime: process.uptime()
  });
});

app.get('/db-status', async (req, res) => {
  try {
    if (!mongoose.connection.readyState) {
      throw new Error("No active database connection");
    }
    
    // Test connection with a ping
    await mongoose.connection.db.admin().ping();
    
    res.json({
      status: "connected",
      dbName: mongoose.connection.name,
      collections: await mongoose.connection.db.listCollections().toArray()
    });
  } catch (err) {
    res.status(500).json({
      status: "disconnected",
      error: err.message,
      connectionState: mongoose.STATES[mongoose.connection.readyState],
      connectionString: process.env.MONGODB_URI ? "exists" : "missing"
    });
  }
});



app.get('/debug-connection', (req, res) => {
  res.json({
    connectionString: process.env.MONGODB_URI 
      ? process.env.MONGODB_URI.replace(/\/\/[^@]+@/, '//****:****@')
      : 'missing'
  });
});



// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await connectDB();
});