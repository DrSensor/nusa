extern crate alloc;
use crate::{host, types, Accessor, Build, Series};
use core::primitive;
use types::number::{JSNumber, Type};
use types::BitSet;

macro_rules! bridge {
    ($ty:ident, $Ty:ident) => {
        #[allow(non_camel_case_types)]
        pub struct $ty {
            len: host::Len,
            ptr: types::Number,
            diff: Option<types::Change>, // WARN: Unfortunaly the compiler can't optimize this even when initialize as None
            accr: (host::num::Getter, host::num::Setter),
        }

        impl Build for self::$ty {
            const TYPE_ID: primitive::i8 = Type::$Ty as primitive::i8;
            type Accessor = (host::num::Getter, host::num::Setter);
            unsafe fn accessor() -> Self::Accessor {
                host::num::accessor_noop();
                host::num::accessor(Type::$Ty as primitive::i8).into()
            }
            fn diff(addr: usize, len: host::Len) -> usize {
                addr - types::Change::byte(len)
            }
            unsafe fn allocate(len: host::Len) -> usize {
                host::num::alloc_noop();
                let ptr = host::num::allocate(Type::$Ty as primitive::i8, len, false);
                ptr.addr
            }
            unsafe fn auto_allocate() -> (usize, host::Len) {
                host::num::alloc_noop();
                let (ptr, len) = host::num::allocateAUTO(Type::$Ty as primitive::i8, false).into();
                (ptr.addr, len)
            }
            unsafe fn prop_allocate(prop_name: &str) -> (usize, host::Len) {
                host::num::alloc_noop();
                let (ptr, len) =
                    host::num::allocatePROP(prop_name, Type::$Ty as primitive::i8, false).into();
                (ptr.addr, len)
            }
            unsafe fn build(
                len: host::Len,
                addr: usize,
                accr: Self::Accessor,
                diff_addr: Option<usize>,
            ) -> Self {
                $ty {
                    len,
                    ptr: types::Number { addr },
                    diff: diff_addr.map(|addr| types::Change { addr }),
                    accr,
                }
            }
        }

        impl Default for $ty {
            fn default() -> Self {
                unsafe {
                    let (addr, len) = Self::auto_allocate();
                    Self::build(len, addr, Self::accessor(), Some(Self::diff(addr, len)))
                }
            }
        }
        impl self::$ty {
            pub fn prop_name(name: impl Into<&'static str>) -> Self {
                unsafe {
                    let (addr, len) = Self::prop_allocate(name.into());
                    Self::build(len, addr, Self::accessor(), Some(Self::diff(addr, len)))
                }
            }
            pub fn new(len: host::Len) -> Self {
                unsafe { Self::build(len, Self::allocate(len), Self::accessor(), None) }
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
                let value = value as JSNumber;
                let (getter, setter) = self.accr;
                if let Some(diff) = self.diff {
                    unsafe { host::num::exchange(getter, setter, diff, self.ptr, value) }
                } else {
                    unsafe { host::num::set(setter, self.ptr, value) }
                }
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
