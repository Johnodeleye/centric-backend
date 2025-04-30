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
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout for initial connection
      socketTimeoutMS: 45000, // 45 seconds timeout for queries
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed!", error);
    process.exit(1);
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

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await connectDB();
});