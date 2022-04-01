import { validationResult } from 'express-validator';

function parametersValidation(req) {
  // Parameters validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return { success: false, error: errors.array() };
  }
  return { success: true };
}

/**
 * Checks if a string value is a 64 character hex string
 * @param {string} str String value
 * @returns {boolean} True if it is a tx hex
 */
function isStringHex(str) {
  return /^[0-9a-fA-F]{64}$/.test(str);
}

module.exports = {
  parametersValidation,
  isStringHex,
};
