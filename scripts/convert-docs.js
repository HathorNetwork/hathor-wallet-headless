/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { writeFile } = require('fs/promises');
const apiDocs = require('../src/api-docs');

(async () => {
  // Remove redundant `default` property
  const docsObj = apiDocs.default || apiDocs;

  // Remove obsolete properties
  delete docsObj.components.securitySchemes;

  // Output to temporary JSON file
  await writeFile('./tmp/api-docs.json', JSON.stringify(docsObj, null, 2));
})()
  .catch(err => console.error(err.stack));
