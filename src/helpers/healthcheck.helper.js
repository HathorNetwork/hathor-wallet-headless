const ALLOWED_COMPONENT_TYPES = ['datastore', 'fullnode', 'internal', 'service'];
const ALLOWED_STATUSES = ['fail', 'pass', 'warn'];

/**
 * Builds a health check object for a component
 *
 * @param {string} componentName
 * @param {string} status
 * @param {string} componentType
 * @param {string} output
 * @returns {Object}
 */
export function buildComponentHealthCheck(componentName, status, componentType, output) {
  // Assert the component name is a string
  if (typeof componentName !== 'string' || componentName.length === 0) {
    throw new Error('Component name must be a non-empty string');
  }

  // Assert the component type is one of the allowed values
  if (!ALLOWED_COMPONENT_TYPES.includes(componentType)) {
    throw new Error(`Component status must be one of: ${ALLOWED_COMPONENT_TYPES.join(', ')}`);
  }

  // Assert the status is one of the allowed values
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error(`Component status must be one of: ${ALLOWED_STATUSES.join(', ')}`);
  }

  // Assert the output is a string
  if (typeof output !== 'string' || output.length === 0) {
    throw new Error('Component output must be a non-empty string');
  }

  // Build the health check object
  return {
    componentName,
    status,
    componentType,
    output,
    time: new Date().toISOString(),
  };
}

/**
 * Builds a health check object for a service.
 *
 * @param {string} status
 * @param {string} description
 * @param {Object} checks
 * @returns {Object}
 */
export function buildServiceHealthCheck(status, description, checks) {
  // Assert the description is a string
  if (typeof description !== 'string' || description.length === 0) {
    throw new Error('Service description must be a non-empty string');
  }

  // Assert the status is one of the allowed values
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error(`Service status must be one of: ${ALLOWED_STATUSES.join(', ')}`);
  }

  return {
    status,
    description,
    checks,
  };
}
