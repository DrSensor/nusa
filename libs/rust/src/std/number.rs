use crate::{host, types, Accessor, Build, Series};
use core::{intrinsics::transmute, primitive};
use types::number::{JSNumber, Type};

macro_rules! bridge {
    ($ty:ident, $Ty:ident) => {
        #[allow(non_camel_case_types)]
        pub struct $ty {
            len: host::DataSize,
            addr: usize,
            accr: (host::num::Getter, host::num::Setter),
        }

        impl Build for self::$ty {
            const TYPE_ID: primitive::i8 = Type::$Ty as primitive::i8;
            type Accessor = (host::num::Getter, host::num::Setter);
            unsafe fn accessor() -> Self::Accessor {
                let (getter, setter) =
                    unsafe { host::num::accessor(Type::$Ty as primitive::i8).into() };
                (transmute(getter), transmute(setter))
            }
            unsafe fn allocate(len: host::DataSize) -> usize {
                let number = host::num::allocate(Type::$Ty as primitive::i8, len, false);
                number.addr
            }
            unsafe fn build(len: host::DataSize, addr: usize, accr: Self::Accessor) -> Self {
                $ty { len, addr, accr }
            }
        }

        impl self::$ty {
            #[allow(clippy::new_without_default)]
            pub fn new() -> Self {
                unsafe {
                    let len = host::scope::size();
                    Self::build(len, Self::allocate(len), Self::accessor())
                }
            }
        }

        impl Series for self::$ty {
            fn addr(&self) -> usize {
                self.addr
            }
            fn len(&self) -> host::DataSize {
                self.len
            }
        }

        impl Accessor for self::$ty {
            type Type = primitive::$ty;
            fn set(&self, value: Self::Type) {
                let (_, setter) = self.accr;
                unsafe { host::num::set(setter, self.addr, value as JSNumber) }
            }
            fn get(&self) -> Self::Type {
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
