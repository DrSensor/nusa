use crate::{host, types, Accessor, Series};
use core::{intrinsics::transmute, primitive};
use types::number::{JSNumber, Type};

macro_rules! bridge {
    ($ty:ident, $Ty:ident) => {
        #[allow(non_camel_case_types)]
        pub struct $ty {
            len: host::Size,
            addr: usize,
            accr: (host::num::Getter, host::num::Setter),
        }

        impl Series for self::$ty {
            type As = primitive::$ty;

            fn ptr(&self) -> *const primitive::$ty {
                self.addr as *const primitive::$ty
            }

            fn allocate(len: host::Size) -> (usize, usize) {
                let (number, null) = unsafe { host::num::allocate(Type::$Ty, len, false).into() };
                (number.addr, null.addr)
            }

            fn len(&self) -> host::Size {
                self.len
            }
        }

        impl self::$ty {
            #[allow(clippy::new_without_default)]
            pub fn new() -> Self {
                let len = unsafe { host::scope::size() };
                let (addr, _) = Self::allocate(len);
                let (getter, setter) = unsafe { host::num::accessor(Type::$Ty).into() };
                let accr = unsafe { (transmute(getter), transmute(setter)) };
                $ty { len, addr, accr }
            }
        }

        impl Accessor<primitive::$ty> for self::$ty {
            fn set(self, value: primitive::$ty) {
                let (_, setter) = self.accr;
                unsafe { host::num::set(setter, self.addr, value as JSNumber) }
            }

            fn get(self) -> primitive::$ty {
                let (getter, _) = self.accr;
                unsafe { host::num::get(getter, self.addr) as primitive::$ty }
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
