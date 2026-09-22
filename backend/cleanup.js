/**
 * Cleanup Script — Drops test data from MongoDB + Redis
 * Run: node cleanup.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Redis = require('ioredis');
const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);

(async () => {
  console.log('\n═══════════════════════════════════════');
  console.log('   🧹 SHORTLY — CLEANUP');
  console.log('═══════════════════════════════════════\n');

  // MongoDB
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const names = collections.map((c) => c.name);

    console.log('📁 Collections:', names.join(', ') || '(none)');

    const results = {};

    if (names.includes('users')) {
      const r = await db.collection('users').deleteMany({});
      results.users = r.deletedCount;
    }
    if (names.includes('urls')) {
      const r = await db.collection('urls').deleteMany({});
      results.urls = r.deletedCount;
    }
    if (names.includes('click_events')) {
      const r = await db.collection('click_events').deleteMany({});
      results.click_events = r.deletedCount;
    }

    console.log('\n🗑️  MongoDB deletes:');
    Object.entries(results).forEach(([k, v]) => {
      console.log(`   ${k}: ${v} document(s)`);
    });

    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected\n');
  } catch (err) {
    console.error('❌ MongoDB error:', err.message);
  }

  // Redis / Memurai
  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      lazyConnect: true,
    });
    await redis.connect();
    console.log('✅ Redis connected');

    // Find all shortly:* keys
    let cursor = '0';
    const keys = [];
    do {
      const [nextCursor, found] = await redis.scan(cursor, 'MATCH', 'shortly:*', 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...found);
    } while (cursor !== '0');

    if (keys.length > 0) {
      // Delete in batches
      const CHUNK = 100;
      let deleted = 0;
      for (let i = 0; i < keys.length; i += CHUNK) {
        const chunk = keys.slice(i, i + CHUNK);
        deleted += await redis.del(...chunk);
      }
      console.log(`🗑️  Redis: deleted ${deleted} key(s)`);
    } else {
      console.log('🗑️  Redis: no shortly:* keys found');
    }

    await redis.quit();
    console.log('🔌 Redis disconnected\n');
  } catch (err) {
    console.error('❌ Redis error:', err.message);
  }

  console.log('═══════════════════════════════════════');
  console.log('   ✅ CLEANUP COMPLETE');
  console.log('═══════════════════════════════════════\n');
  process.exit(0);
})();