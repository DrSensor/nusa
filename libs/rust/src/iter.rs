use crate::{host, number, types, Series};
use core::marker::PhantomData;
use core::{ops, primitive};
use types::number::JSNumber;

pub fn for_all<T, F, E, const N: usize>(from: F, exec: E)
where
    T: Series,
    F: Into<[T; N]>,
    E: Fn([All<T>; N]),
{
    exec(from.into().map(All))
}

pub struct All<T: Series>(T);
impl<T: Series> Series for All<T> {
    const TYPE_ID: primitive::i8 = T::TYPE_ID;
    fn addr(&self) -> usize {
        self.0.addr()
    }
    fn len(&self) -> host::DataSize {
        self.0.len()
    }
}

pub struct Buffer<T: Series> {
    addr: usize,
    len: host::DataSize,
    _data: PhantomData<T>,
}
impl<T: Series> Series for Buffer<T> {
    const TYPE_ID: i8 = T::TYPE_ID;
    fn addr(&self) -> usize {
        self.addr
    }
    fn len(&self) -> host::DataSize {
        self.len
    }
}

// TODO: combine into one macro by using `concat_idents!($ops, Assign)`
// https://github.com/rust-lang/rust/issues/29599

macro_rules! bridge {
    (num.mutate: $ops:ident, $ty:ident) => {
        impl ops::$ops<primitive::$ty> for All<number::$ty> {
            fn add_assign(&mut self, rhs: primitive::$ty) {
                let All(data) = self;
                unsafe {
                    host::num::iter_noop();
                    host::num::mutate::addVAL(
                        Self::TYPE_ID,
                        data.len(),
                        false,
                        data.addr(),
                        rhs as JSNumber,
                    )
                }
            }
        }
    };

    (num.compute: $ops:ident, $ty:ident) => {
         impl ops::$ops<primitive::$ty> for All<number::$ty> {
            type Output = Buffer<number::$ty>;
            fn add(self, rhs: primitive::$ty) -> Self::Output {
                let All(data) = self;
                let len = data.len();
                let addr = unsafe {
                    host::num::iter_noop();
                    host::num::compute::addVAL(
                        Self::TYPE_ID,
                        len,
                        false,
                        data.addr(),
                        rhs as JSNumber,
                    )
                };
                let _data = PhantomData;
                Buffer { addr, len, _data }
            }
        }
    };

    (num::$ty:ident) => {
        bridge!(num.mutate: AddAssign, $ty);
        bridge!(num.compute: Add, $ty);
    };
}

bridge!(num::u8);
bridge!(num::i8);

bridge!(num::u16);
bridge!(num::i16);

bridge!(num::u32);
bridge!(num::i32);
bridge!(num::f32);

bridge!(num::u64);
bridge!(num::i64);
bridge!(num::f64);
