import * as number from "../../../core/js/datatype/number.js";

declare const declare: <T extends typeof number.Number & { TYPE_ID: number }>(
  Class: T,
) => (() => InstanceType<T>) & Pick<T, "new" | "TYPE_ID">;

export const u8: ReturnType<typeof declare<typeof number.Uint8>>;
export const i8: ReturnType<typeof declare<typeof number.Int8>>;

export const u16: ReturnType<typeof declare<typeof number.Uint16>>;
export const i16: ReturnType<typeof declare<typeof number.Int16>>;

export const u32: ReturnType<typeof declare<typeof number.Uint32>>;
export const i32: ReturnType<typeof declare<typeof number.Int32>>;
export const f32: ReturnType<typeof declare<typeof number.Float32>>;

export const u64: ReturnType<typeof declare<typeof number.Uint64>>;
export const i64: ReturnType<typeof declare<typeof number.Int64>>;
export const f64: ReturnType<typeof declare<typeof number.Float64>>;
