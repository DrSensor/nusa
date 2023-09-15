pub mod number;
pub use number::{JSNumber, Number};

#[allow(dead_code)]
pub static PAGE: usize = u16::MAX as usize + 1; // 1 page = 64KiB = 65536

macro_rules! convert_between {
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
pub(crate) use convert_between;

#[repr(transparent)]
#[derive(Clone, Copy)]
pub struct Buffer {
    pub addr: usize,
}
convert_between!(Buffer |T| *const T);
impl Layout for Buffer {}

#[repr(transparent)]
#[derive(Clone, Copy)]
pub struct Null {
    pub addr: usize,
}
convert_between!(Null |T| *const T);
impl Null {
    /// length of null count in byte
    pub fn byte(len: u16) -> usize {
        (len as f32 / u8::BITS as f32).ceil() as usize
    }
    /// minimum bits (can be used to determine alignment)
    pub const BITS: u32 = u8::BITS;
}

pub trait Layout
where
    Self: Into<*const c_void> + Copy,
{
    /// WARNING: it may NOT have nullbit
    /// # Safety
    /// ```rs
    /// let this = allocate(ty, len, nullable);
    /// let null = if nullable { Some(this.nullbit(len)) } else { None };
    /// ```
    unsafe fn nullbit(&self, len: u16) -> Null {
        let addr = (*self).into() as usize - Null::byte(len);
        Null { addr }
    }
    // TODO: fn renderbit() -> Render {}
}

use core::ffi::c_void;

#[cfg(any(target_pointer_width = "32", target_pointer_width = "16"))]
pub mod ffi {
    use super::c_void;
    use core::marker::PhantomData;

    #[repr(transparent)]
    pub struct CTuple<L, R> {
        lhs: PhantomData<L>,
        rhs: PhantomData<R>,

        #[cfg(target_pointer_width = "32")]
        pub addr: u64,

        #[cfg(target_pointer_width = "16")]
        pub addr: u32,
    }

    impl<L, R> From<(L, R)> for CTuple<L, R>
    where
        L: Into<*const c_void>,
        R: Into<*const c_void>,
    {
        fn from(tuple: (L, R)) -> Self {
            let (lhs, rhs) = tuple;
            let lead = (lhs.into() as u64) << usize::BITS;
            let trail = rhs.into() as u64;
            Self::from(lead & trail)
        }
    }

    impl<L, R> From<CTuple<L, R>> for (L, R)
    where
        L: From<*const c_void>,
        R: From<*const c_void>,
    {
        fn from(ctuple: CTuple<L, R>) -> Self {
            let lead = (ctuple.addr >> usize::BITS) as *const c_void;
            let trail = ctuple.addr as *const c_void;
            (L::from(lead), R::from(trail))
        }
    }

    macro_rules! impl_From {
        ($ty:ident, $Ty:ident<$($G:ident),+>) => {
            impl<$($G),+> From<$ty> for $Ty<$($G),+> {
                fn from(addr: $ty) -> Self {
                    Self {
                        addr,
                        lhs: PhantomData,
                        rhs: PhantomData,
                    }
                }
            }
        }
    }

    #[cfg(target_pointer_width = "32")]
    impl_From!(u64, CTuple<L, R>);

    #[cfg(target_pointer_width = "16")]
    impl_From!(u32, CTuple<L, R>);
}
