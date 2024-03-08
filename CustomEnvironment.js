/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';

// eslint-disable-next-line import/no-extraneous-dependencies
const NodeEnvironment = require('jest-environment-node').TestEnvironment;

/**
 * Extracts the test name from an absolute path received by the context
 * @param {string} filePath Absolute path
 * @returns {string} Test filename without directories, test suffixes or extensions
 * @example
 * const name = getTestName('/home/user/code/address-info.test.js')
 * assert(name == 'address-info')
 */
function getTestName(filePath) {
  const baseName = path.basename(filePath);
  const extName = path.extname(filePath);

  return baseName.replace(`.test${extName}`, '');
}

/**
 * This custom environment based on the Node environment is used to obtain the test name that is
 * currently being executed, an important piece of information used on `setupTests-integration.js`.
 * @see https://jestjs.io/docs/configuration#testenvironment-string
 */
export default class CustomEnvironment extends NodeEnvironment {
  /**
   * The testname is obtained from the constructor context
   * @param config
   * @param context
   */
  constructor(config, context) {
    super(config, context);
    this.testName = getTestName(context.testPath);
  }

  /**
   * The local testname is injected on the global environment for this specific test on setup
   * @returns {Promise<void>}
   */
  async setup() {
    await super.setup();
    this.global.testName = this.testName;
  }

  /**
   * Mandatory implementation of NodeEnvironment
   * @returns {Context}
   */
  getVmContext() {
    return super.getVmContext();
  }

  /**
   * Mandatory implementation of NodeEnvironment
   * @returns {Promise<void>}
   */
  async teardown() {
    await super.teardown();
  }

  /**
   * Mandatory implementation of NodeEnvironment
   * @param script
   * @returns {*}
   */
  runScript(script) {
    return super.runScript(script);
  }

  /**
   * Mandatory implementation of NodeEnvironment
   * @param event
   */
  handleTestEvent(event) {
    if (event.name === 'error') {
      console.error(`== Jest Circus Environment received an error on ${this.testName}`);
      console.dir(event);
    }
  }
}
