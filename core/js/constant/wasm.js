export const dataTypes = /** @type const */ (["num"]);

export const modNames = /** @type const */ (["arr", "acc", "bulk"]);

import * as num from "../wasm/number.js";
export const load = /** @type const */ ({
  num: {
    arr: num.instance,
    acc: num.accessor,
    bulk: num.fastops,
  },
});
