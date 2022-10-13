/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { validationResult } from 'express-validator';

export function parametersValidation(req) {
  // Parameters validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return { success: false, error: errors.array() };
  }
  return { success: true };
}
