#[path = "../types/number.rs"]
mod types;

use core::arch::wasm32::{memory_grow, memory_size};
use types::{Null, Number, Type};

static PAGE: usize = u16::MAX as usize + 1; // 1 page = 64KiB = 65536

extern "C" {
    fn set_offset(byte: usize);
    fn get_offset() -> usize;
} // offset.s

#[export_name = "allocate"]
unsafe fn array_of(ty: Type, len: u16, nullable: bool) -> (Number, Null) {
    let addr = if nullable {
        let nc_byte = (len as f32 / u8::BITS as f32).ceil() as usize; // length of null count in byte
        get_offset() + nc_byte
    } else {
        get_offset()
    };
    let null_addr = if nullable { get_offset() } else { 0 };

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
    set_offset(addr + len_byte);
    if get_offset() > memory_size::<0>() * PAGE {
        memory_grow(0, 1);
    };

    (Number { addr }, Null { addr: null_addr })
}
