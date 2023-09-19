use crate::{host, types, Accessor, Build, Series};
use core::primitive;
use types::number::{JSNumber, Type};

macro_rules! bridge {
    ($ty:ident, $Ty:ident) => {
        #[allow(non_camel_case_types)]
        pub struct $ty {
            len: host::Len,
            ptr: types::Number,
            accr: (host::num::Getter, host::num::Setter),
        }

        impl Build for self::$ty {
            const TYPE_ID: primitive::i8 = Type::$Ty as primitive::i8;
            type Accessor = (host::num::Getter, host::num::Setter);
            unsafe fn accessor() -> Self::Accessor {
                unsafe { host::num::accessor(Type::$Ty as primitive::i8).into() }
            }
            unsafe fn allocate(len: host::Len) -> usize {
                let ptr = host::num::allocate(Type::$Ty as primitive::i8, len, false);
                ptr.addr
            }
            unsafe fn auto_allocate() -> (usize, host::Len) {
                let (ptr, len) = host::num::allocateAUTO(Type::$Ty as primitive::i8, false).into();
                (ptr.addr, len)
            }
            unsafe fn build(len: host::Len, addr: usize, accr: Self::Accessor) -> Self {
                let ptr = types::Number { addr };
                $ty { len, ptr, accr }
            }
        }

        impl Default for $ty {
            fn default() -> Self {
                unsafe {
                    let (addr, len) = Self::auto_allocate();
                    Self::build(len, addr, Self::accessor())
                }
            }
        }

        impl self::$ty {
            pub fn new(len: host::Len) -> Self {
                unsafe { Self::build(len, Self::allocate(len), Self::accessor()) }
            }
        }

        impl Series for self::$ty {
            const TYPE_ID: primitive::i8 = Type::$Ty as primitive::i8;
            fn addr(&self) -> usize {
                self.ptr.addr
            }
            fn len(&self) -> host::Len {
                self.len
            }
        }

        impl Accessor for self::$ty {
            type Type = primitive::$ty;
            fn set(&self, value: Self::Type) {
                let (_, setter) = self.accr;
                unsafe { host::num::set(setter, self.ptr, value as JSNumber) }
            }
            fn get(&self) -> Self::Type {
                let (getter, _) = self.accr;
                unsafe { host::num::get(getter, self.ptr) as primitive::$ty }
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
