/**
 * Patch an express router to catch any errors and invoke the error handlers
 */
export function patchExpressRouter(router) {
  function handlerWrapper(originalHandler) {
    if (!originalHandler.call) {
      return originalHandler;
    }

    return function(req, res, next) {
      const ret = originalHandler.call(this, req, res, next);
      if (ret.catch) {
        ret.catch((err) => next(err));
      }
      return ret;
    };
  }
  const methods = ['get', 'post', 'put', 'delete'];
  for (const method of methods) {
    const original = router[method];
    const wrapper = {
      [method]: function (path, ...callbacks) {
        return original.call(this, path, ...callbacks.map(handlerWrapper));
      }
    }
    router[method] = wrapper[method];
  }
  return router;
}

