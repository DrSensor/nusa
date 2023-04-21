const { port1, port2 } = new MessageChannel();
port2.start();

/** Schedule task
@param callback{VoidFunction}
@param options{AddEventListenerOptions=}
@returns {() => void}
*/ function macro(callback, options) {
  port2.addEventListener("message", callback, options);
  port1.postMessage(null);
  return () => port2.removeEventListener("message", callback);
}

/** Schedule micro task
@param callback{VoidFunction}
@returns {() => true}
*/ function micro(callback) {
  let /** @type true | undefined */ cancel;
  queueMicrotask(() => cancel ?? callback());
  return () => cancel = true;
}

let skipFrame = false, prepareFrame = false;
const queue = /** @type FrameRequestCallback[] */ ([]);

/** Prepare (mark) for next render
@param callback{VoidFunction} - inside callback, it may call {@link render} function
@returns {() => VoidFunction | undefined}
*/ export function prepare(callback) {
  skipFrame = prepareFrame = true;
  callback();
  return () => {
    skipFrame = false;
    const cancel = render(() => {});
    prepareFrame = false;
    return cancel;
  };
}

/** Defer execution into next task
@param callback{VoidFunction}
@param options{AddEventListenerOptions=}
*/ export function defer(callback, options) {
  let /** @type VoidFunction | undefined */ abort;
  const cancel = macro(() => {
    skipFrame = true;
    const unlock = () => abort = micro(() => skipFrame = false);
    ifAsync(callback(), unlock) || unlock();
  }, options);
  return () => {
    cancel();
    abort?.();
    skipFrame = false;
  };
}

/** Schedule when browser on idle
@param callback{IdleRequestCallback}
@param options{IdleRequestOptions=}
@returns {() => void}
*/ export function idle(callback, options) {
  let /** @type VoidFunction | undefined */ abort;
  const id = requestIdleCallback((deadline) => {
    skipFrame = true;
    const unlock = () => abort = micro(() => skipFrame = false);
    ifAsync(callback(deadline), unlock) || unlock();
  }, options);
  return () => {
    cancelIdleCallback(id);
    abort?.();
    skipFrame = false;
  };
}

/** Schedule into render/animation frame via rAF
@param callback{FrameRequestCallback}
@returns {() => void}
*/ function prerender(callback) {
  const id = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(id);
}

/** Schedule into render/animation frame
@param callback{FrameRequestCallback}
@returns {VoidFunction | undefined}
*/ export function render(callback) {
  if (prepareFrame && skipFrame) {
    queue.push(callback);
    return;
  }
  let /** @type VoidFunction | undefined */ abort,
    /** @type VoidFunction */ cancel;
  if (skipFrame) cancel = prerender(callback);
  else {
    if (!prepareFrame) queue.push(callback);
    cancel = postrender(() =>
      abort = prerender((t) => {
        let callback; // deno-lint-ignore no-cond-assign
        while (callback = queue.pop()) callback(t);
      })
    );
  }
  return () => {
    cancel();
    abort?.();
  };
}

// TODO: replace with requestPostAnimationFrame
/** Schedule after render/animation frame
@param callback{FrameRequestCallback}
@returns {() => void}
*/ function postrender(callback) {
  let /** @type VoidFunction | undefined */ abort;
  const cancel = prerender((t) => abort = macro(() => callback(t)));
  return () => {
    cancel();
    abort?.();
  };
}

/** Check if callback is async
@param callbackReturn{unknown}
@param resolve{() => void}
@returns {true | undefined}
*/ function ifAsync(callbackReturn, resolve) {
  if (callbackReturn instanceof Promise) {
    callbackReturn.then(resolve);
    return true;
  }
}
