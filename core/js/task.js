/// <reference types="./task.d.ts" />
/** @typedef {import("./task.js")} $ */

const { port1, port2 } = new MessageChannel();
port2.start();

/** @type $["macro"] */
function macro(callback, options) {
  port2.addEventListener("message", callback, options);
  port1.postMessage(null);
  return () => port2.removeEventListener("message", callback);
}

/** @type $["micro"] */
function micro(callback) {
  let /** @type true | undefined */ cancel;
  queueMicrotask(() => cancel ?? callback());
  return () => {
    cancel = true;
    return cancel;
  };
}

let skipFrame = false;
let prepareFrame = false;
const queue = /** @type FrameRequestCallback[] */ ([]);

/** @type $["prepare"] */
export function prepare(callback) {
  skipFrame = prepareFrame = true;
  callback();
  return () => {
    skipFrame = false;
    const cancel = render(() => {});
    prepareFrame = false;
    return cancel;
  };
}

/** @type $["defer"] */
export function defer(callback, options) {
  let /** @type VoidFunction | undefined */ abort;
  const cancel = macro(() => {
    skipFrame = true;
    const unlock = () => {
      abort = micro(() => {
        skipFrame = false;
      });
    };
    ifAsync(callback(), unlock) || unlock();
  }, options);
  return () => {
    cancel();
    abort?.();
    skipFrame = false;
  };
}

/** @type $["idle"] */
export function idle(callback, options) {
  let /** @type VoidFunction | undefined */ abort;
  const id = requestIdleCallback((deadline) => {
    skipFrame = true;
    const unlock = () => {
      abort = micro(() => {
        skipFrame = false;
      });
    };
    ifAsync(callback(deadline), unlock) || unlock();
  }, options);
  return () => {
    cancelIdleCallback(id);
    abort?.();
    skipFrame = false;
  };
}

/** @type $["prerender"] */
function prerender(callback) {
  const id = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(id);
}

/** @type $["render"] */
export function render(callback) {
  if (prepareFrame && skipFrame) {
    queue.push(callback);
    return;
  }
  let /** @type VoidFunction | undefined */ abort;
  let /** @type VoidFunction */ cancel;
  if (skipFrame) cancel = prerender(callback);
  else {
    if (!prepareFrame) queue.push(callback);
    cancel = postrender(() => {
      abort = prerender((t) => {
        let callback = queue.pop();
        while (callback) {
          callback(t);
          callback = queue.pop();
        }
      });
    });
  }
  return () => {
    cancel();
    abort?.();
  };
}

// TODO: replace with requestPostAnimationFrame
/** @type $["postrender"] */
function postrender(callback) {
  let /** @type VoidFunction | undefined */ abort;
  const cancel = prerender((t) => {
    abort = macro(() => callback(t));
  });
  return () => {
    cancel();
    abort?.();
  };
}

/** @type $["ifAsync"] */
function ifAsync(callbackReturn, resolve) {
  if (callbackReturn instanceof Promise) {
    callbackReturn.then(resolve);
    return true;
  }
}
