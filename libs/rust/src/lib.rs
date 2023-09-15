mod datatype;
mod host;
mod types;
use core::primitive;

pub mod iter;
pub use datatype::{null::Null, number};
pub use number::*;

pub trait Accessor {
    type Type;
    fn set(&self, value: Self::Type);
    fn get(&self) -> Self::Type;
}

pub trait Series {
    const TYPE_ID: primitive::i8;
    fn addr(&self) -> usize;
    fn len(&self) -> host::DataSize;
    fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

#[allow(clippy::missing_safety_doc)]
pub trait Build {
    const TYPE_ID: primitive::i8;
    type Accessor;
    unsafe fn accessor() -> Self::Accessor;
    unsafe fn allocate(len: host::DataSize) -> usize;
    unsafe fn build(len: host::DataSize, addr: usize, accessor: Self::Accessor) -> Self;
}
