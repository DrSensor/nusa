/** Schedule task */
declare function macro(
  callback: VoidFunction,
  options?: AddEventListenerOptions,
): () => void;

/** Schedule micro task */
declare function micro(callback: VoidFunction): () => true;

/** Prepare (mark) for next render */
export function prepare(callback: VoidFunction): () => VoidFunction | void;

/** Defer execution into next task*/
export function defer(
  callback: VoidFunction,
  options?: AddEventListenerOptions,
): VoidFunction;

/** Schedule when browser on idle */
export function idle(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions,
): VoidFunction;
/** Schedule into render/animation frame via rAF */
declare function prerender(callback: FrameRequestCallback): () => void;

/** Schedule into render/animation frame */
export function render(
  callback: FrameRequestCallback,
): VoidFunction | undefined;

/** Schedule after render/animation frame */
declare function postrender(callback: FrameRequestCallback): () => void;

/** Check if callback is async */
declare function ifAsync(
  callbackReturn: unknown,
  resolve: () => void,
): true | undefined;
