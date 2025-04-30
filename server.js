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

// Improved connection event listeners
mongoose.connection.on('connecting', () => {
  console.log('🔄 Attempting MongoDB connection...');
});

mongoose.connection.on('connected', () => {
  isDBConnected = true;
  console.log("✅ MongoDB connected to DB:", mongoose.connection.name);
});

mongoose.connection.on('error', (err) => {
  isDBConnected = false;
  console.error("❌ MongoDB connection error:", err.message);
});

mongoose.connection.on('disconnected', () => {
  isDBConnected = false;
  console.log("ℹ️ MongoDB disconnected");
});

// Proper connection function
const connectDB = async () => {
  // Skip if already connected
  if (mongoose.connection.readyState === 1) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      w: 'majority'
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error("Full error details:", {
      name: error.name,
      code: error.code,
      host: error.host,
      reason: error.reason || 'No additional error info'
    });
    process.exit(1); // Exit process on connection failure
  }
};

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// Enhanced root endpoint
app.get("/", (req, res) => {
  res.json({
    api: "running",
    database: isDBConnected ? "connected" : "not connected",
    connectionState: mongoose.STATES[mongoose.connection.readyState],
    timestamp: new Date().toISOString()
  });
});

// Comprehensive health check
app.get("/health", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error("Database not connected");
    }

    // Test with both ping and collection listing
    await mongoose.connection.db.admin().ping();
    const collections = await mongoose.connection.db.listCollections().toArray();

    res.json({
      status: "healthy",
      dbName: mongoose.connection.name,
      collections: collections.map(c => c.name),
      connectionState: mongoose.STATES[mongoose.connection.readyState]
    });
  } catch (err) {
    res.status(500).json({
      status: "unhealthy",
      error: err.message,
      connectionState: mongoose.STATES[mongoose.connection.readyState],
      uptime: process.uptime()
    });
  }
});

// Connection debug endpoint
app.get('/debug-connection', (req, res) => {
  res.json({
    connectionString: process.env.MONGODB_URI 
      ? process.env.MONGODB_URI.replace(/\/\/[^@]+@/, '//****:****@')
      : 'missing',
    mongooseState: mongoose.STATES[mongoose.connection.readyState],
    mongooseVersion: mongoose.version
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   // Initialize DB connection
//   connectDB().catch(err => {
//     console.error("Failed to initialize database connection:", err);
//     process.exit(1);
//   });
// });


const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});


// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});