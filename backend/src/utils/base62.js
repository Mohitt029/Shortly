/**
 * Base62 Encoder/Decoder
 * Converts between numbers and Base62 strings (0-9, a-z, A-Z)
 *
 * Used for: Encoding Snowflake IDs into compact short codes
 * Alphabet: 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ (62 chars)
 */

const { config } = require('../config/env');

const ALPHABET = config.shortCode.alphabet; // '0123456789...XYZ'
const BASE = ALPHABET.length;                // 62
const BASE_MAP = {};

// Build reverse lookup map for O(1) decoding
for (let i = 0; i < ALPHABET.length; i++) {
  BASE_MAP[ALPHABET[i]] = i;
}

/**
 * Encode a non-negative integer to a Base62 string.
 * @param {number|bigint} num - Non-negative integer (use BigInt for Snowflake IDs)
 * @returns {string} Base62 encoded string
 */
function encode(num) {
  if (num === 0) return ALPHABET[0];

  let n = typeof num === 'bigint' ? num : BigInt(num);
  let result = '';

  while (n > 0n) {
    const remainder = Number(n % 62n);
    result = ALPHABET[remainder] + result;
    n = n / 62n;
  }

  return result;
}

/**
 * Decode a Base62 string back to a number.
 * @param {string} str - Base62 encoded string
 * @returns {bigint} Decoded number (BigInt to safely handle Snowflake IDs)
 */
function decode(str) {
  if (typeof str !== 'string' || str.length === 0) {
    throw new Error('Invalid Base62 string');
  }

  let num = 0n;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const value = BASE_MAP[char];

    if (value === undefined) {
      throw new Error(`Invalid Base62 character: "${char}"`);
    }

    num = num * 62n + BigInt(value);
  }

  return num;
}

/**
 * Encode with padding to a fixed length.
 * Pads with leading '0' to reach target length.
 * @param {number|bigint} num - Number to encode
 * @param {number} length - Target length
 * @returns {string} Padded Base62 string
 */
function encodePadded(num, length) {
  const encoded = encode(num);
  return encoded.padStart(length, ALPHABET[0]);
}

/**
 * Check if a string is a valid Base62 string.
 * @param {string} str
 * @returns {boolean}
 */
function isValidBase62(str) {
  if (typeof str !== 'string' || str.length === 0) return false;
  return str.split('').every((char) => BASE_MAP[char] !== undefined);
}

module.exports = {
  encode,
  decode,
  encodePadded,
  isValidBase62,
  ALPHABET,
  BASE,
};