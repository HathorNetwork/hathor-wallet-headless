import { validationResult } from 'express-validator';

const parametersValidation = (req) => {
  // Parameters validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return {success: false, error: errors.array()};
  } else {
    return {success: true};
  }
}

module.exports = {
  parametersValidation,
}
