pub mod number;
pub use number::{JSNumber, Number};

#[repr(transparent)]
pub struct Null {
    pub addr: usize,
}
