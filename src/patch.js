/**
 * Patch an express router to catch any errors and invoke the error handlers
 */
export function patchExpressRouter(router) {
  function handlerWrapper(originalHandler) {
    if (!originalHandler.call) {
      return originalHandler;
    }

    function wrappedHandler(req, res, next) {
      const ret = originalHandler.call(this, req, res, next);
      if (ret && ret.catch) {
        ret.catch(err => next(err));
      }
      return ret;
    }
    return wrappedHandler;
  }
  const methods = ['get', 'post', 'put', 'delete'];
  for (const method of methods) {
    const original = router[method];
    const wrapper = {
      [method](path, ...callbacks) {
        return original.call(this, path, ...callbacks.map(handlerWrapper));
      },
    };
    // eslint-disable-next-line
    router[method] = wrapper[method];
  }
  return router;
}
