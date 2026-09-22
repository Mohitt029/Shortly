require('dotenv').config();
const dns = require('dns').promises;
const mongoose = require('mongoose');

async function debug() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  🔍 MONGODB ATLAS CONNECTION DEBUGGER');
  console.log('═══════════════════════════════════════════════════\n');

  // STEP 1: Env var
  console.log('📋 STEP 1: Environment Variable Check');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('   ❌ MONGODB_URI not set');
    process.exit(1);
  }
  console.log('   ✅ MONGODB_URI loaded');
  const masked = uri.replace(/:([^@]+)@/, ':****@');
  console.log(`   📝 ${masked}\n`);

  // STEP 2: Parse hostname
  console.log('📋 STEP 2: Parse Connection String');
  const hostMatch = uri.match(/@([^/?]+)/);
  const host = hostMatch ? hostMatch[1] : null;
  console.log(`   🌐 Host: ${host}\n`);

  // STEP 3: Test SRV with system DNS
  console.log('📋 STEP 3: SRV Lookup (System DNS)');
  try {
    const records = await dns.resolveSrv(`_mongodb._tcp.${host}`);
    console.log('   ✅ SRV records found:');
    records.forEach((r) => console.log(`      → ${r.name}:${r.port} (priority ${r.priority}, weight ${r.weight})`));
  } catch (err) {
    console.error(`   ❌ FAILED: ${err.code} — ${err.message}`);
  }
  console.log();

  // STEP 4: Test SRV with Google DNS
  console.log('📋 STEP 4: SRV Lookup (Google DNS 8.8.8.8)');
  const { Resolver } = require('dns');
  const resolver = new Resolver();
  resolver.setServers(['8.8.8.8', '8.8.4.4']);
  try {
    const records = await new Promise((resolve, reject) => {
      resolver.resolveSrv(`_mongodb._tcp.${host}`, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });
    console.log('   ✅ SRV records found via Google DNS:');
    records.forEach((r) => console.log(`      → ${r.name}:${r.port}`));
  } catch (err) {
    console.error(`   ❌ FAILED: ${err.code} — ${err.message}`);
  }
  console.log();

  // STEP 5: Test TXT record
  console.log('📋 STEP 5: TXT Record Lookup');
  try {
    const txt = await dns.resolveTxt(host);
    console.log('   ✅ TXT records:', txt.flat().join(', '));
  } catch (err) {
    console.error(`   ❌ TXT FAILED: ${err.code} — ${err.message}`);
  }
  console.log();

  // STEP 6: Try actual connection with DNS override
  console.log('📋 STEP 6: Test Actual Connection (with Google DNS)');
  const dnsSync = require('dns');
  dnsSync.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      family: 4,
    });
    console.log('   ✅✅✅ CONNECTION SUCCESSFUL!');
    console.log(`   📊 Database: ${mongoose.connection.name}`);
    console.log(`   🌐 Host: ${mongoose.connection.host}`);
    await mongoose.disconnect();
  } catch (err) {
    console.error(`   ❌ CONNECTION FAILED: ${err.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════\n');
  process.exit(0);
}

debug();