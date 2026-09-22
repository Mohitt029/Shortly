/**
 * URL Mongoose Model
 *
 * Stores the mapping: short_code → long_url + metadata
 * Optimized with indexes for fast lookups on hot paths.
 */

const mongoose = require('mongoose');
const { config } = require('../config/env');

const urlSchema = new mongoose.Schema(
  {
    // ─────────────────────────────────────────
    // SHORT CODE (Primary lookup key)
    // ─────────────────────────────────────────
    shortCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      minlength: config.shortCode.length,
      maxlength: config.shortCode.maxCustomLength,
    },

    // ─────────────────────────────────────────
    // SNOWFLAKE ID (for internal reference & sorting)
    // ─────────────────────────────────────────
    snowflakeId: {
      type: String,       // Store as String (BigInt → String)
      required: true,
      index: true,
    },

    // ─────────────────────────────────────────
    // URL DATA
    // ─────────────────────────────────────────
    longUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      index: true,        // For dedup detection
    },

    // Original (pre-canonicalization) URL, if different
    originalUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
    },

    domain: {
      type: String,
      required: true,
      index: true,
    },

    // ─────────────────────────────────────────
    // OWNERSHIP
    // ─────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,        // For "list my URLs"
    },

    // ─────────────────────────────────────────
    // TYPE / STATUS
    // ─────────────────────────────────────────
    isCustom: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // ─────────────────────────────────────────
    // EXPIRATION
    // ─────────────────────────────────────────
    expiresAt: {
      type: Date,
      default: null,
      index: true,        // For cleanup queries
    },

    // ─────────────────────────────────────────
    // ANALYTICS (denormalized for fast reads)
    // ─────────────────────────────────────────
    clickCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastAccessedAt: {
      type: Date,
      default: null,
    },

    // ─────────────────────────────────────────
    // METADATA
    // ─────────────────────────────────────────
    createdByIp: {
      type: String,
      select: false,      // Don't return in queries by default
    },

    userAgent: {
      type: String,
      select: false,
      maxlength: 500,
    },
  },
  {
    timestamps: true,   // Adds createdAt, updatedAt
    versionKey: false,
    collection: 'urls',
  }
);

// ─────────────────────────────────────────
// COMPOUND INDEXES (for common queries)
// ─────────────────────────────────────────

// User's URLs, most recent first
urlSchema.index({ userId: 1, createdAt: -1 });

// Active + non-expired lookups
urlSchema.index({ isActive: 1, expiresAt: 1 });

// Domain analysis
urlSchema.index({ domain: 1, createdAt: -1 });

// ─────────────────────────────────────────
// VIRTUAL FIELDS
// ─────────────────────────────────────────

// Full short URL (e.g., http://localhost:5000/abc123)
urlSchema.virtual('shortUrl').get(function () {
  const { config } = require('../config/env');
  return `${config.shortUrlDomain}/${this.shortCode}`;
});

// Is this link expired?
urlSchema.virtual('isExpired').get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// ─────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────

/**
 * Check if this URL is expired.
 */
urlSchema.methods.checkExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

/**
 * Increment click count (returns updated doc).
 */
urlSchema.methods.incrementClick = async function () {
  this.clickCount += 1;
  this.lastAccessedAt = new Date();
  return this.save();
};

// ─────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────

/**
 * Find by short code (most common lookup).
 */
urlSchema.statics.findByShortCode = function (shortCode) {
  return this.findOne({ shortCode, isActive: true });
};

/**
 * Find by short code including expired (for cleanup).
 */
urlSchema.statics.findByShortCodeIncludingExpired = function (shortCode) {
  return this.findOne({ shortCode });
};

// ─────────────────────────────────────────
// JSON SERIALIZATION
// ─────────────────────────────────────────

urlSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.createdByIp;
    delete ret.userAgent;
    return ret;
  },
});

module.exports = mongoose.model('Url', urlSchema);