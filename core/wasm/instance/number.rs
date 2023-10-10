mod offset;
mod scope;
mod types;

use core::arch::wasm32::{memory_grow, memory_size};
use types::{number::Type, Null, Number, C, PAGE};

#[export_name = "num.arr.noop"]
fn noop() {}

#[export_name = "num.allocate"]
#[inline(never)]
unsafe fn array_of(ty: Type, len: u16, nullable: bool) -> Number {
    let addr = offset::get() + if nullable { Null::byte(len) } else { 0 };

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

#[export_name = "num.allocateAUTO"]
unsafe fn array_new(ty: Type, nullable: bool) -> (Number, u16) {
    let size = scope::size();
    (array_of(ty, size, nullable), size)
}

#[cfg(any(target_pointer_width = "32", target_pointer_width = "16"))]
#[export_name = "num.cABIallocateAUTO"]
unsafe fn c_array_new(ty: Type, nullable: bool) -> C::Tuple<Number, u16> {
    C::Tuple::from(array_new(ty, nullable))
}

C::primitive_Item!(u16);
