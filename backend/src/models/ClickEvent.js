/**
 * ClickEvent Model
 *
 * Stores each individual click on a short URL for rich analytics.
 * Aggregated with TTL index so old events auto-expire (90 days default).
 */

const mongoose = require('mongoose');

const clickEventSchema = new mongoose.Schema(
  {
    // ─────────────────────────────────────────
    // LINK REFERENCE
    // ─────────────────────────────────────────
    shortCode: {
      type: String,
      required: true,
      index: true,
    },

    urlId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Url',
      required: true,
      index: true,
    },

    // ─────────────────────────────────────────
    // CLIENT INFO
    // ─────────────────────────────────────────
    ip: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
      maxlength: 500,
    },

    referer: {
      type: String,
      default: null,
      maxlength: 500,
    },

    // ─────────────────────────────────────────
    // PARSED CLIENT DATA
    // ─────────────────────────────────────────
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'bot', 'unknown'],
      default: 'unknown',
      index: true,
    },

    browser: {
      type: String,
      default: 'unknown',
      index: true,
    },

    browserVersion: {
      type: String,
      default: null,
    },

    os: {
      type: String,
      default: 'unknown',
      index: true,
    },

    // ─────────────────────────────────────────
    // GEO
    // ─────────────────────────────────────────
    country: {
      type: String,
      default: null,
      index: true,
    },

    city: {
      type: String,
      default: null,
    },

    region: {
      type: String,
      default: null,
    },

    // ─────────────────────────────────────────
    // TIMESTAMPS
    // ─────────────────────────────────────────
    clickedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // We use clickedAt
    versionKey: false,
    collection: 'click_events',
  }
);

// ─────────────────────────────────────────
// COMPOUND INDEXES
// ─────────────────────────────────────────

// Recent events for a specific link (most common query)
clickEventSchema.index({ shortCode: 1, clickedAt: -1 });

// Analytics by country/time
clickEventSchema.index({ shortCode: 1, country: 1, clickedAt: -1 });

// Analytics by device
clickEventSchema.index({ shortCode: 1, device: 1, clickedAt: -1 });

// ⭐ TTL index: auto-delete events after 90 days
clickEventSchema.index({ clickedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('ClickEvent', clickEventSchema);