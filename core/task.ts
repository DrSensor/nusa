const { port1, port2 } = new MessageChannel();
port2.start();

export function macro(callback: VoidFunction): VoidFunction {
  port2.addEventListener("message", callback);
  port1.postMessage(undefined);
  return () => port2.removeEventListener("message", callback);
}

export function micro(callback: VoidFunction) {
  let cancel: true | undefined;
  queueMicrotask(() => cancel ?? callback());
  return () => cancel = true;
}

export function prerender(callback: FrameRequestCallback) {
  const id = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(id);
}

// BUG: put callback in queue/array to avoid delay
export function render(callback: FrameRequestCallback) {
  let abort: VoidFunction | undefined;
  const cancel = postrender(() => prerender((t) => callback(t)));
  return () => {
    cancel();
    abort?.();
  };
}

// TODO: replace with requestPostAnimationFrame
// BUG: for now put callback in queue/array to avoid delay
export function postrender(callback: FrameRequestCallback): VoidFunction {
  let abort: VoidFunction | undefined;
  const cancel = prerender((t) => abort = macro(() => callback(t)));
  return () => {
    cancel();
    abort?.();
  };
}
