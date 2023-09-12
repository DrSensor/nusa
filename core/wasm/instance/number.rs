mod offset;
mod types;

use core::arch::wasm32::{memory_grow, memory_size};
use types::{number::Type, Null, Number};

static PAGE: usize = u16::MAX as usize + 1; // 1 page = 64KiB = 65536

#[export_name = "num.allocate"] // TODO: return only Number
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
