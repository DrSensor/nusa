#![allow(clippy::missing_safety_doc)]

use core::arch::wasm32::{memory_grow, memory_size};
use Type::*;

pub struct Number {
    addr: usize,
}
pub struct Null {
    addr: usize,
}
type JSNumber = f64;

static PAGE: usize = u16::MAX as usize + 1; // 1 page = 64KiB = 65536

// BUG(rust): NO `global.get` and `global.set` instruction! Instead it use the linear memory to store static mut value
// ideally it should be `thread_local!(static mut OFFSET = 0)`

/// You MUST call `exports._setOffset(exports.__heap_base)` on the JS side at startup
#[export_name = "_setOffset"]
unsafe fn set_offset(offset: usize) {
    OFFSET = offset
}
static mut OFFSET: usize = 8; // __data_end = --stack-size + 4 * count(all static/global variables)
                              // stack = __heap_base-1 ~ __data_end

/// Call `exports._setIndex(currentScopeIndex)` every time the event listener run
#[export_name = "_setIndex"]
unsafe fn set_index(index: isize) {
    INDEX = index
}
static mut INDEX: isize = 0;

#[allow(dead_code)]
#[repr(i8)]
enum Type {
    Uint8 = 1,
    Int8 = -1,

    Uint16 = 2,
    Int16 = -2,

    Uint32 = 3,
    Int32 = -3,
    Float32 = -128 + 3,

    Uint64 = 4,
    Int64 = -4,
    Float64 = -128 + 4,
}

type Setter = unsafe fn(Number, JSNumber);
type Getter = unsafe fn(Number) -> JSNumber;

#[export_name = "accr"] // WARNING: this func not inlined inside alloc() because rust wasm +multivalue can only return at most 2 value
fn accessor(ty: Type) -> (Getter, Setter) {
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

#[export_name = "alloc"]
unsafe fn array_of(ty: Type, len: u16, nullable: bool) -> (Number, Null) {
    let addr = if nullable {
        let nc_byte = 4 * (len as f32 / u64::BITS as f32).ceil() as u8; // length of null count in byte
        OFFSET + nc_byte as usize
    } else {
        OFFSET
    };
    let null_addr = if nullable { OFFSET } else { 0 };

    let ty = ty as i8;
    let byte = if ty > -64 {
        ty.unsigned_abs()
    } else {
        (128 + ty as i16) as u8
    }; // <-- same as below but produce smaller wasm
       // let byte: u8 = match ty {
       //     Uint8 | Int8 => 1,
       //     Uint16 | Int16 => 2,
       //     Uint32 | Int32 | Float32 => 3,
       //     Uint64 | Int64 | Float64 => 4,
       // };

    let len_byte = len as usize * byte as usize; // shift offset for the next allocation
    OFFSET = addr + len_byte; // WARNING: may need mutex guard
    if OFFSET > memory_size::<0>() * PAGE {
        memory_grow(0, 1);
    };

    (Number { addr }, Null { addr: null_addr })
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
    *nullptr(this) |= 1 << INDEX
}

#[export_name = "clrNULL"]
unsafe fn clear_null(this: Null) {
    *nullptr(this) &= !(1 << INDEX)
}

#[export_name = "isNULL"]
unsafe fn is_null(this: Null) -> bool {
    ((*nullptr(this) >> INDEX) & 1) != 0
}

unsafe fn nullptr(this: Null) -> *mut u64 {
    let offset = (INDEX as f32 / u64::BITS as f32).floor() as usize;
    (this.addr as *mut u64).add(offset)
}

mod truncate {
    use super::*;

    pub unsafe fn setter<T>(this: Number, val: JSNumber)
    where
        T: TryFrom<u64>,
    {
        let ptr = (this.addr as *mut T).offset(INDEX);
        *ptr = (val as u64).try_into().unwrap_unchecked();
    }

    pub unsafe fn getter<T>(this: Number) -> JSNumber
    where
        T: TryInto<u64>,
    {
        let ptr = (this.addr as *const T).offset(INDEX);
        ptr.read().try_into().unwrap_unchecked() as JSNumber
    }
}

mod rounding {
    use super::*;

    /// There is no `TryFrom<f64> for f32` because it's ambiguous.
    /// Currently `f64 as f32` use `roundTiesToEven` mode.
    pub unsafe fn setter_f32(this: Number, val: JSNumber) {
        let ptr = (this.addr as *mut f32).offset(INDEX);
        *ptr = val as f32;
    }

    pub unsafe fn setter<T>(this: Number, val: JSNumber)
    where
        T: TryFrom<f64>,
    {
        let ptr = (this.addr as *mut T).offset(INDEX);
        *ptr = val.try_into().unwrap_unchecked();
    }

    pub unsafe fn getter<T>(this: Number) -> JSNumber
    where
        T: TryInto<f64>,
    {
        let ptr = (this.addr as *const T).offset(INDEX);
        ptr.read().try_into().unwrap_unchecked()
    }
}
