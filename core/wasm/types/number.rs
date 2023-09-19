#![allow(dead_code)]
use super::{convert_ptr, Layout, C};

pub type JSNumber = f64;

#[repr(transparent)]
#[derive(Clone, Copy)]
pub struct Number {
    pub addr: usize,
}

convert_ptr!(Number);
impl Layout for Number {}

impl From<C::Item> for Number {
    fn from(C::Item(value): C::Item) -> Self {
        Self {
            addr: value as usize,
        }
    }
}
impl From<Number> for C::Item {
    fn from(this: Number) -> Self {
        Self(unsafe { this.addr.try_into().unwrap_unchecked() })
    }
}

#[repr(i8)]
pub enum Type {
    Uint8 = 1,
    Int8 = -1,

    Uint16 = 2,
    Int16 = -2,

    Uint32 = 4,
    Int32 = -4,
    Float32 = -128 + 4,

    Uint64 = 8,
    Int64 = -8,
    Float64 = -128 + 8,
}
