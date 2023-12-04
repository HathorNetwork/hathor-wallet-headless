/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { writeFile } = require('fs/promises');
const { getApiDocs } = require('../src/api-docs');
const settings = require('../src/settings');

(async () => {
  // Fetch config data from this instance and generate the ApiDocs
  await settings.setupConfig();
  const docsObj = getApiDocs();

  // Output to temporary JSON file
  await writeFile('./tmp/api-docs.json', JSON.stringify(docsObj, null, 2));
})()
  .catch(err => console.error(err.stack));
