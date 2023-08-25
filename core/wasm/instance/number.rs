#[path = "../types/number.rs"]
mod types;

#[path = "./offset.rs"]
mod offset;
use core::arch::wasm32::{memory_grow, memory_size};
use types::{Null, Number, Type};

static PAGE: usize = u16::MAX as usize + 1; // 1 page = 64KiB = 65536

#[export_name = "allocate"]
unsafe fn array_of(ty: Type, len: u16, nullable: bool) -> (Number, Null) {
    let addr = if nullable {
        let nc_byte = (len as f32 / u8::BITS as f32).ceil() as usize; // length of null count in byte
        offset::get() + nc_byte
    } else {
        offset::get()
    };
    let null_addr = if nullable { offset::get() } else { 0 };

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
    offset::set(addr + len_byte);
    if offset::get() > memory_size::<0>() * PAGE {
        memory_grow(0, 1);
    };

    (Number { addr }, Null { addr: null_addr })
}
