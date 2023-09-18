/**
 * Patch an express router to catch any errors and invoke the error handlers.
 *
 * The patch will wrap some router methods (e.g. get, post) and the wrapped method
 * will just call the original method but wrapping only the handlers.
 *
 * The wrapped handlers will not interfere with the handler funcionality, it will
 * just check that the return is a promise and catch any errors.
 */
export function patchExpressRouter(router) {
  /**
   * This method is a wrapper for handlers that uses the logic:
   * - Check that the original handler is a function, if not, just return it without wrapping it
   * - Return a handler that calls the original handler and handles async errors
   */
  function handlerWrapper(originalHandler) {
    // Here we check that the original handler is a function
    // We don't need to be strict (i.e. check that the type is Function or AsyncFunction)
    // just check that the call method is available to be used is enough.
    if (!originalHandler.call) {
      return originalHandler;
    }

    /**
     * This is the returned handler, it is a sync function that calls the original handler
     * and if it returns a promise, catch the error and send it to `next` so the error
     * handlers and middlewares can properly handle the errors
     */
    function wrappedHandler(req, res, next) {
      const ret = originalHandler.call(this, req, res, next);
      // Here we check that the handler returned a promise, since we use babel
      // it can be challenging since it transpile promises to thenable objects
      // but checking for the existence of `catch` is equivalent to checking for a thenable
      if (ret && ret.catch) {
        ret.catch(err => next(err));
      }
      return ret;
    }
    return wrappedHandler;
  }

  // These are the methods being patched on the given router
  const methods = ['get', 'post', 'put', 'delete'];
  for (const method of methods) {
    const original = router[method];

    // We create a wrapper object so the method being called can have a context (i.e. `this`)
    // and the wrapped method will not be an anonymous function
    // (which can cause some issues with express core methods)
    const wrapper = {
      [method](path, ...callbacks) {
        // Call the original handler but passing the current context, path and wrap all
        // handlers after that.
        return original.call(this, path, ...callbacks.map(handlerWrapper));
      },
    };
    // Here we router method to our wrapped method, but eslint does not like this type of assignment
    // The error given is `no-param-reassign`
    // eslint-disable-next-line
    router[method] = wrapper[method];
  }
  return router;
}
