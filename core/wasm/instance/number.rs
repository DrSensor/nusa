mod offset;
mod scope;
mod types;

use core::arch::wasm32::{memory_grow, memory_size};
use types::{number::Type, Null, Number, C, PAGE};

extern "C" {
    // WARN: Currently `&str` transformed into `param i32 i32` but in the future it might be `stringref`
    #[allow(improper_ctypes)]
    fn prop(prop_name: &str) -> (Number, i32);
    fn cache(addr: Number, len: u16);
}

#[export_name = "num.arr.noop"]
fn noop() {}

unsafe fn allocate_at(addr: usize, ty: Type, len: u16) -> Number {
    let ty = ty as i8;
    let byte = if ty > -64 {
        ty.unsigned_abs()
    } else {
        (128 + ty as i16) as u8
    }; // <-- same as below but produce smaller wasm
       // let byte: u8 = match ty {
       //     Uint8 | Int8 => 1,
       //     Uint16 | Int16 => 2,
       //     Uint32 | Int32 | Float32 => 4,
       //     Uint64 | Int64 | Float64 => 8,
       // };

    let len_byte = len as usize * byte as usize; // shift offset for the next allocation
    offset::set(addr + len_byte);
    if offset::get() > memory_size(0) * PAGE {
        memory_grow(0, 1);
    };

    Number { addr }
}

#[export_name = "num.allocate"]
#[inline(never)]
unsafe fn array_new(ty: Type, len: u16, nullable: bool) -> Number {
    let addr = if nullable { Null::byte(len) } else { 0 } + offset::get();
    allocate_at(addr, ty, len)
}

#[export_name = "num.allocateAUTO"]
unsafe fn array_construct(ty: Type, nullable: bool) -> (Number, u16) {
    let len = scope::size();
    let addr = if nullable { Null::byte(len) } else { 0 } + offset::get();
    (allocate_at(addr, ty, len), len)
}

#[export_name = "num.allocatePROP"]
unsafe fn array_of(prop_name: &str, ty: Type, nullable: bool) -> (Number, u16) {
    let (addr, len) = match prop(prop_name) {
        (addr, len) if len != -1 => (addr, len as u16),
        _ => {
            let (addr, len) = array_construct(ty, nullable);
            cache(addr, len);
            (addr, len)
        }
    };
    (addr, len)
}

#[cfg(any(target_pointer_width = "32", target_pointer_width = "16"))]
#[export_name = "num.cABIallocatePROP"]
unsafe fn c_array_of(prop_name: &str, ty: Type, nullable: bool) -> C::Tuple<Number, u16> {
    C::Tuple::from(array_of(prop_name, ty, nullable))
}

#[cfg(any(target_pointer_width = "32", target_pointer_width = "16"))]
#[export_name = "num.cABIallocateAUTO"]
unsafe fn c_array_new(ty: Type, nullable: bool) -> C::Tuple<Number, u16> {
    C::Tuple::from(array_construct(ty, nullable))
}

C::primitive_Item!(u16);
