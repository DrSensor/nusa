use crate::{host, types, Accessor, Build, Series};
use types::BitSet;

pub struct Null<T: Build> {
    ptr: types::Null,
    data: T,
}

impl<T: Build> Build for self::Null<T> {
    const TYPE_ID: i8 = 0;
    type Accessor = T::Accessor;
    unsafe fn accessor() -> Self::Accessor {
        T::accessor()
    }
    fn diff(addr: usize, len: host::Len) -> usize {
        addr - types::Null::byte(len) - types::Change::byte(len)
    }
    unsafe fn allocate(len: host::Len) -> usize {
        let ptr = host::num::allocate(T::TYPE_ID, len, true); // BUG: `host::num`? What if `T` is `str`
        ptr.addr - types::Null::byte(len)
    }
    unsafe fn auto_allocate() -> (usize, host::Len) {
        host::null::noop();
        let (ptr, len) = host::num::allocateAUTO(T::TYPE_ID, true).into(); // BUG: `host::num`? What if `T` is `str`
        let addr = ptr.addr - types::Null::byte(len);
        (addr, len)
    }
    unsafe fn prop_allocate(prop_name: &str) -> (usize, host::Len) {
        host::num::alloc_noop();
        let (ptr, len) = host::num::allocatePROP(prop_name, T::TYPE_ID, false).into();
        let addr = ptr.addr - types::Null::byte(len);
        (addr, len)
    }
    unsafe fn build(
        len: host::Len,
        addr: usize,
        accessor: Self::Accessor,
        diff_addr: Option<usize>,
    ) -> Self {
        host::null::noop();
        self::Null {
            ptr: types::Null {
                addr: addr - types::Null::byte(len),
            },
            data: T::build(len, addr + types::Null::byte(len), accessor, diff_addr),
        }
    }
}

impl<T: Build> Default for Null<T> {
    fn default() -> Self {
        unsafe {
            let (addr, len) = Self::auto_allocate();
            Self::build(len, addr, Self::accessor(), Some(Self::diff(addr, len)))
        }
    }
}
impl<T: Build> self::Null<T> {
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

impl<T: Build + Series> Series for self::Null<T> {
    const TYPE_ID: i8 = <T as Series>::TYPE_ID;
    fn addr(&self) -> usize {
        self.data.addr()
    }
    fn len(&self) -> host::Len {
        self.data.len()
    }
}

impl<T: Build + Accessor> Accessor for self::Null<T> {
    type Type = Option<T::Type>;
    fn set(&self, value: Self::Type) {
        if let Some(value) = value {
            unsafe { host::null::clr(self.ptr) };
            self.data.set(value)
        } else {
            unsafe { host::null::set(self.ptr) };
        }
    }
    fn get(&self) -> Self::Type {
        let is_null = unsafe { host::null::chk(self.ptr) };
        if is_null {
            None
        } else {
            Some(self.data.get())
        }
    }
}
