use crate::{host, number, types, Series};
use core::ops;
use std::primitive;
use types::number::{JSNumber, Type};

#[repr(transparent)]
pub struct All<T: Series>(T);

pub fn for_all<T, F, E, const N: usize>(from: F, exec: E)
where
    T: Series,
    F: Into<[T; N]>,
    E: Fn([All<T>; N]),
{
    exec(from.into().map(All))
}

macro_rules! bridge {
    ($ty:ident, $Ty:ident) => {
        impl ops::AddAssign<primitive::$ty> for All<number::$ty> {
            fn add_assign(&mut self, rhs: primitive::$ty) {
                let All(data) = self;
                unsafe {
                    host::num::iter_noop();
                    host::num::mutate::addVAL(
                        Type::$Ty as i8,
                        data.len(),
                        false,
                        data.addr(),
                        rhs as JSNumber,
                    )
                }
            }
        }

        // TODO: is this correct?
        impl ops::Add<primitive::$ty> for All<number::$ty> {
            type Output = host::BufAddr;
            fn add(self, rhs: primitive::$ty) -> Self::Output {
                let All(data) = self;
                unsafe {
                    host::num::iter_noop();
                    host::num::compute::addVAL(
                        Type::$Ty as i8,
                        data.len(),
                        false,
                        data.addr(),
                        rhs as JSNumber,
                    ) as Self::Output
                }
            }
        }
    };
}

bridge!(u8, Uint8);
bridge!(i8, Int8);

bridge!(u16, Uint16);
bridge!(i16, Int16);

bridge!(u32, Uint32);
bridge!(i32, Int32);
bridge!(f32, Float32);

bridge!(u64, Uint64);
bridge!(i64, Int64);
bridge!(f64, Float64);
