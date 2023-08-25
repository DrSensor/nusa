#[path = "../types/number.rs"]
mod types;

use types::{JSNumber, Null, Number, Type};

extern "C" {
    fn current_index() -> isize;
} // index.s

type Setter = unsafe fn(Number, JSNumber);
type Getter = unsafe fn(Number) -> JSNumber;

#[export_name = "accr"] // WARNING: this func not inlined inside alloc() because rust wasm +multivalue can only return at most 2 value
fn accessor(ty: Type) -> (Getter, Setter) {
    use Type::*;
    match ty {
        Uint8 => (truncate::getter::<u8>, truncate::setter::<u8>),
        Int8 => (truncate::getter::<i8>, truncate::setter::<i8>),

        Uint16 => (truncate::getter::<u16>, truncate::setter::<u16>),
        Int16 => (truncate::getter::<i16>, truncate::setter::<i16>),

        Uint32 => (truncate::getter::<u32>, truncate::setter::<u32>),
        Int32 => (truncate::getter::<i32>, truncate::setter::<i32>),
        Float32 => (rounding::getter::<f32>, rounding::setter_f32),

        Uint64 => (truncate::getter::<u64>, truncate::setter::<u64>),
        Int64 => (truncate::getter::<i64>, truncate::setter::<i64>),
        Float64 => (rounding::getter::<f64>, rounding::setter::<f64>),
    }
}

#[no_mangle]
fn set(set: fn(Number, JSNumber), this: Number, val: JSNumber) {
    set(this, val)
}
#[no_mangle]
fn get(get: fn(Number) -> JSNumber, this: Number) -> JSNumber {
    get(this)
}

#[export_name = "setNULL"]
unsafe fn set_null(this: Null) {
    *nullptr(this) |= 1 << current_index()
}

#[export_name = "clrNULL"]
unsafe fn clear_null(this: Null) {
    *nullptr(this) &= !(1 << current_index())
}

#[export_name = "isNULL"]
unsafe fn is_null(this: Null) -> bool {
    ((*nullptr(this) >> current_index()) & 1) != 0
}

unsafe fn nullptr(this: Null) -> *mut isize {
    let offset = (current_index() as f32 / isize::BITS as f32).floor() as usize;
    (this.addr as *mut isize).add(offset)
}

unsafe fn ptr<T>(this: Number) -> *mut T {
    // TODO(unstable): refactor `this.addr as PointerLike` so it can be casted as `*const T` too
    (this.addr as *mut T).offset(current_index())
}

mod truncate {
    use super::*;

    pub unsafe fn setter<T>(this: Number, val: JSNumber)
    where
        T: TryFrom<u64>,
    {
        *ptr::<T>(this) = (val as u64).try_into().unwrap_unchecked();
    }

    pub unsafe fn getter<T>(this: Number) -> JSNumber
    where
        T: TryInto<u64>,
    {
        ptr::<T>(this).read().try_into().unwrap_unchecked() as JSNumber
    }
}

mod rounding {
    use super::*;

    /// There is no `TryFrom<f64> for f32` because it's ambiguous.
    /// Currently `f64 as f32` use `roundTiesToEven` mode.
    pub unsafe fn setter_f32(this: Number, val: JSNumber) {
        *ptr(this) = val as f32;
    }

    pub unsafe fn setter<T>(this: Number, val: JSNumber)
    where
        T: TryFrom<f64>,
    {
        *ptr::<T>(this) = val.try_into().unwrap_unchecked();
    }

    pub unsafe fn getter<T>(this: Number) -> JSNumber
    where
        T: TryInto<f64>,
    {
        ptr::<T>(this).read().try_into().unwrap_unchecked()
    }
}
