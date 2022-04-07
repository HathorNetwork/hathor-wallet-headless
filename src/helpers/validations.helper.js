// eslint-disable-next-line import/no-import-module-exports
import { validationResult } from 'express-validator';

function parametersValidation(req) {
  // Parameters validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return { success: false, error: errors.array() };
  }
  return { success: true };
}

module.exports = {
  parametersValidation,
};
