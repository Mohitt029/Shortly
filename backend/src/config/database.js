/**
 * MongoDB Atlas Connection
 * Mongoose connection with retry logic and event handlers
 */

const mongoose = require('mongoose');
const dns = require('dns');
const { config } = require('./env');
const logger = require('../utils/logger');

// ============================================
// FIX: Force Google DNS for SRV lookups
// This solves querySrv ECONNREFUSED on Windows
// ============================================
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  logger.info('🌐 DNS servers set to Google (8.8.8.8, 8.8.4.4) + Cloudflare (1.1.1.1)');
} catch (err) {
  logger.warn('⚠️  Could not set DNS servers:', err.message);
}

// Connection options
const options = {
  autoIndex: config.env !== 'production',
  maxPoolSize: 50,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 15000,   // Increased from 10s to 15s
  socketTimeoutMS: 45000,
  family: 4,                         // Force IPv4
  retryWrites: true,
  retryReads: true,
  connectTimeoutMS: 15000,
  heartbeatFrequencyMS: 10000,
};

let isConnected = false;
let retryCount = 0;
const MAX_RETRIES = 5;

/**
 * Connect to MongoDB Atlas
 */
async function connectDatabase() {
  if (isConnected) {
    logger.info('📦 MongoDB already connected');
    return mongoose.connection;
  }

  try {
    logger.info('🔌 Connecting to MongoDB Atlas...');
    logger.info(`   Retry attempt: ${retryCount + 1}/${MAX_RETRIES}`);

    await mongoose.connect(config.mongodb.uri, options);

    isConnected = true;
    retryCount = 0;
    logger.info(`✅ MongoDB connected: ${mongoose.connection.host}`);
    logger.info(`📊 Database: ${mongoose.connection.name}`);

    return mongoose.connection;
  } catch (error) {
    retryCount++;
    logger.error(`❌ MongoDB connection failed (attempt ${retryCount}):`, error.message);

    if (retryCount >= MAX_RETRIES) {
      logger.error('🛑 Max retries reached. Giving up.');
      logger.error('💡 Troubleshooting tips:');
      logger.error('   1. Check MongoDB Atlas IP whitelist (Network Access)');
      logger.error('   2. Verify username/password in .env');
      logger.error('   3. Ensure cluster is running (not paused)');
      logger.error('   4. Test DNS: nslookup -type=SRV _mongodb._tcp.cluster0.cmowvzr.mongodb.net 8.8.8.8');
      process.exit(1);
    }

    const delay = Math.min(5000 * retryCount, 30000);
    logger.info(`🔄 Retrying in ${delay / 1000} seconds...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return connectDatabase();
  }
}

/**
 * Gracefully disconnect
 */
async function disconnectDatabase() {
  if (!isConnected) return;
  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('🔌 MongoDB disconnected gracefully');
  } catch (error) {
    logger.error('❌ MongoDB disconnect error:', error.message);
  }
}

// Connection event handlers
mongoose.connection.on('connected', () => {
  logger.info('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error('📡 Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('📡 Mongoose disconnected from MongoDB');
  isConnected = false;
});

mongoose.connection.on('reconnected', () => {
  logger.info('📡 Mongoose reconnected to MongoDB');
  isConnected = true;
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getConnection: () => mongoose.connection,
  isConnected: () => isConnected,
};