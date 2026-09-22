/**
 * DNS Configuration Preload
 * Forces Node.js to use Google + Cloudflare DNS for SRV lookups.
 * Required for MongoDB Atlas mongodb+srv:// on Windows.
 */

const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

console.log('🌐 Node DNS configured:', dns.getServers());
