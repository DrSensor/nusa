export const none = 0,
  /** `<tag :: attribute:="">` */
  hasBinding = 1 << 0,
  /** `<tag :: on:event="">` */
  hasListener = 1 << 1;

export type type = number;
