/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { z } from 'zod';
import { validationResult } from 'express-validator';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 */

export function parametersValidation(req) {
  // Parameters validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return { success: false, error: errors.array() };
  }
  return { success: true };
}

export function validateZodSchema(schema) {
  return (req, res, next) => {
    try {
      req.originalBody = req.body;
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      const errorMessages = error.errors.map(issue => (`${issue.path.join('.')} is ${issue.message}`));
      res.status(400).json({ success: false, details: errorMessages });
    }
  }
}
