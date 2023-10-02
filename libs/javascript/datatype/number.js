/// <reference types="./number.d.ts" />
/** @typedef {import("./number.js")} $ */
import { number } from "../../../core/js/datatype.js";

/** @type $["declare"] */
const declare = (Class) =>
  // @ts-expect-error I can't find utility type to make abstract class instantiable when used as generic constraint
  Object.assign(() => new Class(), {
    new: Class.new.bind(Class),
    get TYPE_ID() {
      return Class.TYPE_ID;
    },
  });

export const u8 = declare(number.Uint8),
  i8 = declare(number.Int8);

export const u16 = declare(number.Uint16),
  i16 = declare(number.Int16);

export const u32 = declare(number.Uint32),
  i32 = declare(number.Int32),
  f32 = declare(number.Float32);

export const u64 = declare(number.Uint64),
  i64 = declare(number.Int64),
  f64 = declare(number.Float64);
