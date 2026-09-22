/**
 * Snowflake ID Generator (Twitter-style)
 *
 * Generates 64-bit unique IDs across distributed systems without coordination.
 *
 * Structure (64 bits total):
 * ┌─────────┬─────────────┬─────────────┬──────────────────┐
 * │ 1 bit   │ 41 bits     │ 10 bits     │ 12 bits          │
 * │ Sign(0) │ Timestamp   │ Worker ID   │ Sequence Number  │
 * └─────────┴─────────────┴─────────────┴──────────────────┘
 *
 * - Timestamp: ms since custom epoch (Jan 1, 2024)
 *   → 41 bits = ~69 years of IDs
 * - Worker ID: unique per instance (0-1023)
 * - Sequence: per-ms counter (0-4095) → 4096 IDs/ms = 4M IDs/sec/worker
 *
 * Benefits:
 * - No collision (guaranteed unique by design)
 * - K-sortable (time-ordered for efficient DB writes)
 * - Decentralized (no shared counter needed)
 * - Ultra-fast (in-memory generation)
 */

const { config } = require('../config/env');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const { AppError } = require('./apiResponse');

// Extract config
const EPOCH = BigInt(config.snowflake.epoch);       // Custom epoch (ms)
const WORKER_ID_BITS = 10n;
const SEQUENCE_BITS = 12n;
const MAX_WORKER_ID = 1023;
const MAX_SEQUENCE = 4095;

// Bit shift amounts
const WORKER_ID_SHIFT = SEQUENCE_BITS;              // 12
const TIMESTAMP_SHIFT = WORKER_ID_BITS + SEQUENCE_BITS; // 22

class SnowflakeGenerator {
  constructor(workerId = config.snowflake.workerId) {
    if (workerId < 0 || workerId > MAX_WORKER_ID) {
      throw new Error(`Worker ID must be between 0 and ${MAX_WORKER_ID}`);
    }

    this.workerId = BigInt(workerId);
    this.sequence = 0n;
    this.lastTimestamp = -1n;
  }

  /**
   * Get current timestamp in ms.
   */
  currentTime() {
    return BigInt(Date.now());
  }

  /**
   * Wait until next millisecond.
   */
  async waitNextMillis(lastTimestamp) {
    let timestamp = this.currentTime();
    while (timestamp <= lastTimestamp) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      timestamp = this.currentTime();
    }
    return timestamp;
  }

  /**
   * Generate next Snowflake ID.
   * @returns {bigint} Unique 64-bit ID
   */
  async nextId() {
    let timestamp = this.currentTime();

    // Clock moved backwards — handle gracefully
    if (timestamp < this.lastTimestamp) {
      const drift = this.lastTimestamp - timestamp;
      // If small drift (<5ms), wait for clock to catch up
      if (drift < 5n) {
        timestamp = await this.waitNextMillis(this.lastTimestamp);
      } else {
        // Large drift — throw error (indicates system clock issue)
        throw new AppError(
          `Clock moved backwards by ${drift}ms. Refusing to generate ID.`,
          HTTP_STATUS.INTERNAL_ERROR,
          ERROR_CODES.INTERNAL_ERROR
        );
      }
    }

    // Same millisecond: increment sequence
    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & BigInt(MAX_SEQUENCE);

      // Sequence overflow: wait for next millisecond
      if (this.sequence === 0n) {
        timestamp = await this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      // New millisecond: reset sequence
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    // Compose the ID
    const id =
      ((timestamp - EPOCH) << TIMESTAMP_SHIFT) |
      (this.workerId << WORKER_ID_SHIFT) |
      this.sequence;

    return id;
  }

  /**
   * Generate next Snowflake ID as string.
   * Use this for JSON responses (avoids BigInt serialization issues).
   */
  async nextIdString() {
    const id = await this.nextId();
    return id.toString();
  }

  /**
   * Extract timestamp from a Snowflake ID.
   * @param {bigint|string} id
   * @returns {Date}
   */
  static extractTimestamp(id) {
    const bigId = typeof id === 'bigint' ? id : BigInt(id);
    const timestamp = (bigId >> TIMESTAMP_SHIFT) + EPOCH;
    return new Date(Number(timestamp));
  }

  /**
   * Extract worker ID from a Snowflake ID.
   * @param {bigint|string} id
   * @returns {number}
   */
  static extractWorkerId(id) {
    const bigId = typeof id === 'bigint' ? id : BigInt(id);
    return Number((bigId >> WORKER_ID_SHIFT) & BigInt(MAX_WORKER_ID));
  }

  /**
   * Extract sequence from a Snowflake ID.
   */
  static extractSequence(id) {
    const bigId = typeof id === 'bigint' ? id : BigInt(id);
    return Number(bigId & BigInt(MAX_SEQUENCE));
  }
}

// Singleton instance
const snowflake = new SnowflakeGenerator();

module.exports = {
  snowflake,
  SnowflakeGenerator,
  nextId: () => snowflake.nextId(),
  nextIdString: () => snowflake.nextIdString(),
};