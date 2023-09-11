#![allow(dead_code)]
use super::{convert_between, Layout};

pub type JSNumber = f64;

#[repr(transparent)]
#[derive(Clone, Copy)]
pub struct Number {
    pub addr: usize,
}
convert_between!(Number |T| *const T);
impl Layout for Number {}

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
