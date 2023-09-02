#[path = "types/number.rs"]
pub mod types;

use core::slice;
use types::{JSNumber, Null, Number, Type};

/// export_name is based on https://pola-rs.github.io/polars/py-polars/html/reference/expressions/operators.html#numeric

#[export_name = "addVal"]
unsafe fn add_by_value(ty: Type, len: u16, skip_null: bool, this: Number, val: JSNumber) {
    use Type::*;
    match ty {
        Uint8 => add::by_value::truncate::<u8>(len, skip_null, this, val),
        Int8 => add::by_value::truncate::<i8>(len, skip_null, this, val),

        Uint16 => add::by_value::truncate::<u16>(len, skip_null, this, val),
        Int16 => add::by_value::truncate::<i16>(len, skip_null, this, val),

        Uint32 => add::by_value::truncate::<u32>(len, skip_null, this, val),
        Int32 => add::by_value::truncate::<i32>(len, skip_null, this, val),
        Float32 => add::by_value::rounding_f32(len, skip_null, this, val),

        Uint64 => add::by_value::truncate::<u64>(len, skip_null, this, val),
        Int64 => add::by_value::truncate::<i64>(len, skip_null, this, val),
        Float64 => add::by_value::rounding::<f64>(len, skip_null, this, val),
    }
}

/// based on https://lemire.me/blog/2018/02/21/iterating-over-set-bits-quickly/
unsafe fn iter_nonnull(null: Null, len_byte: u16, mut callback: impl FnMut(usize)) {
    for i in 0..len_byte as usize {
        let nullptr = (null.addr as *const i8).add(i);
        let mut nullbit = nullptr.read();
        while nullbit != 0 {
            callback((i as u32 * u8::BITS + nullbit.trailing_zeros()) as usize);
            nullbit ^= nullbit & -nullbit;
        }
    }
}

unsafe fn iter<T>(skip_null: bool, this: Number, len: u16, mut mutate: impl FnMut(*mut T, usize)) {
    let array = slice::from_raw_parts_mut(this.addr as *mut T, len as usize);
    if skip_null {
        let nc_byte = (len as f32 / u8::BITS as f32).ceil(); // length of null count in byte
        let addr = this.addr - nc_byte as usize;
        iter_nonnull(Null { addr }, nc_byte as u16, move |i| {
            let item = array.get_unchecked_mut(i);
            mutate(item, i);
        });
    } else {
        for (i, item) in array.iter_mut().enumerate() {
            mutate(item, i);
        }
    }
}

mod add {
    use super::*;
    use core::ops::AddAssign;

    pub mod by_value {
        use super::*;

        pub unsafe fn truncate<T>(len: u16, skip_null: bool, this: Number, val: JSNumber)
        where
            T: AddAssign<T> + TryFrom<u64>,
        {
            iter(skip_null, this, len, move |item: *mut T, _| {
                *item += (val as u64).try_into().unwrap_unchecked()
            })
        }

        pub unsafe fn rounding<T>(len: u16, skip_null: bool, this: Number, val: JSNumber)
        where
            T: AddAssign<T> + TryFrom<f64>,
        {
            iter(skip_null, this, len, move |item: *mut T, _| {
                *item += val.try_into().unwrap_unchecked()
            })
        }

        /// There is no `TryFrom<f64> for f32` because it's ambiguous.
        /// Currently `f64 as f32` use `roundTiesToEven` mode.
        pub unsafe fn rounding_f32(len: u16, skip_null: bool, this: Number, val: JSNumber) {
            iter(skip_null, this, len, move |item: *mut f32, _| {
                *item += val as f32
            })
        }
    }
}
