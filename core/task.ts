const { port1, port2 } = new MessageChannel();
port2.start();

function macro(
  callback: VoidFunction,
  options?: AddEventListenerOptions,
): VoidFunction {
  port2.addEventListener("message", callback, options);
  port1.postMessage(null);
  return () => port2.removeEventListener("message", callback);
}

function micro(callback: VoidFunction) {
  let cancel: true | undefined;
  queueMicrotask(() => cancel ?? callback());
  return () => cancel = true;
}

let skipFrame = false, prepareFrame = false;
const queue = [] as FrameRequestCallback[];

export function prepare(callback: VoidFunction) {
  skipFrame = prepareFrame = true;
  callback();
  return () => {
    skipFrame = false;
    const cancel = render(() => {});
    prepareFrame = false;
    return cancel;
  };
}

export function defer(
  callback: VoidFunction,
  options?: AddEventListenerOptions,
) {
  let abort: VoidFunction | undefined;
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

export function idle(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions,
) {
  let abort: VoidFunction | undefined;
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

function prerender(callback: FrameRequestCallback) {
  const id = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(id);
}

export function render(callback: FrameRequestCallback) {
  if (prepareFrame && skipFrame) {
    queue.push(callback);
    return;
  }
  let abort: VoidFunction | undefined, cancel: VoidFunction;
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
function postrender(callback: FrameRequestCallback): VoidFunction {
  let abort: VoidFunction | undefined;
  const cancel = prerender((t) => abort = macro(() => callback(t)));
  return () => {
    cancel();
    abort?.();
  };
}

function ifAsync(callbackReturn: unknown, resolve: () => void) {
  if (callbackReturn instanceof Promise) {
    callbackReturn.then(resolve);
    return true;
  }
}