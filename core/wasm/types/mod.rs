pub mod number;
pub use number::{JSNumber, Number};

#[allow(dead_code)]
pub static PAGE: usize = u16::MAX as usize + 1; // 1 page = 64KiB = 65536

#[allow(non_camel_case_types)]
pub type byte = u8;

pub fn bits_of<T>() -> usize {
    core::mem::size_of::<T>() * byte::BITS as usize
}

macro_rules! convert_ptr {
    ($ty:ty) => {
        convert_ptr!($ty |T| *const T);
        convert_ptr!($ty |T| *mut T);
    };
    ($into:ty |$($G:ident)?| $from:ty) => {
        impl$(<$G>)? From<$from> for $into {
            fn from(ptr: $from) -> Self {
                let addr = ptr as usize;
                Self { addr }
            }
        }
        impl$(<$G>)? From<$into> for $from {
            fn from(value: $into) -> Self {
                value.addr as Self
            }
        }
    };
}
pub(crate) use convert_ptr;

#[repr(transparent)]
#[derive(Clone, Copy)]
pub struct Buffer {
    pub addr: usize,
}
convert_ptr!(Buffer);
impl Layout for Buffer {}

#[repr(transparent)]
#[derive(Clone, Copy)]
pub struct Null {
    pub addr: usize,
}
convert_ptr!(Null);
impl Null {
    /// length of null count in byte
    pub fn byte(len: u16) -> usize {
        (len as f32 / byte::BITS as f32).ceil() as usize
    }
    /// minimum bits (can be used to determine alignment)
    pub const BITS: u32 = u8::BITS;
}

pub trait Layout
where
    Self: Into<*const C::void> + Copy,
{
    /// WARNING: it may NOT have nullbit
    /// # Safety
    /// ```rs
    /// let this = allocate(ty, len, nullable);
    /// C null = if nullable { Some(this.nullbit(len)) } else { None };
    /// ```
    unsafe fn nullbit(&self, len: u16) -> Null {
        let addr = (*self).into() as usize - Null::byte(len);
        Null { addr }
    }
    // TODO: fn renderbit() -> Render {}
}

#[cfg(any(target_pointer_width = "32", target_pointer_width = "16"))]
#[allow(non_snake_case)]
pub mod C {
    use super::bits_of;
    pub use core::ffi::c_void as void;
    use core::marker::PhantomData;

    #[cfg(target_pointer_width = "32")]
    pub type Return = u64;
    #[cfg(target_pointer_width = "16")]
    pub type Return = u32;

    #[repr(transparent)]
    pub struct Item(pub Return);

    #[allow(unused_macros)]
    macro_rules! primitive_Item {
        ($ty:ty) => {
            impl From<$ty> for C::Item {
                fn from(value: $ty) -> Self {
                    C::Item(value as C::Return)
                }
            }
        };
    }
    #[allow(unused_imports)]
    pub(crate) use primitive_Item;

    #[allow(unused_macros)]
    macro_rules! fn_Item {
        ($ty:ty) => {
            impl From<$ty> for C::Item {
                fn from(func: $ty) -> Self {
                    let addr = func as usize;
                    C::Item(addr as C::Return)
                }
            }
        };
    }
    #[allow(unused_imports)]
    pub(crate) use fn_Item;

    #[repr(transparent)]
    pub struct Tuple<L, R> {
        lhs: PhantomData<L>,
        rhs: PhantomData<R>,
        addr: Return,
    }

    impl<L, R> From<(L, R)> for Tuple<L, R>
    where
        L: Into<Item>,
        R: Into<Item>,
    {
        fn from((lhs, rhs): (L, R)) -> Self {
            let lead = lhs.into().0 << bits_of::<R>();
            let Item(trail) = rhs.into();
            Self::from(lead & trail)
        }
    }

    impl<L, R> From<Tuple<L, R>> for (L, R)
    where
        L: From<Return>,
        R: From<Return>,
    {
        fn from(ctuple: Tuple<L, R>) -> Self {
            let lead = ctuple.addr >> bits_of::<R>();
            let trail = ctuple.addr;
            (L::from(lead), R::from(trail))
        }
    }

    impl<L, R> From<Return> for Tuple<L, R> {
        fn from(addr: Return) -> Self {
            Self {
                addr,
                lhs: PhantomData,
                rhs: PhantomData,
            }
        }
    }
}
