use crate::{host, types, Accessor, Build, Series};
use core::ffi::c_void;

pub struct Null<T: Build> {
    addr: usize, // TODO: pass this on every *fastops/number.wasm* functions
    data: T,
}

impl<T: Build> Build for self::Null<T> {
    const TYPE_ID: i8 = 0;
    type Accessor = T::Accessor;
    unsafe fn accessor() -> Self::Accessor {
        T::accessor()
    }
    unsafe fn allocate(len: host::DataSize) -> usize {
        let ptr: *const c_void = unsafe { host::num::allocate(T::TYPE_ID, len, true).into() };
        ptr as usize - types::Null::byte(len)
    }
    unsafe fn build(_: host::DataSize, _: usize, _: Self::Accessor) -> Self {
        Null::new()
    }
}

impl<T: Build> self::Null<T> {
    #[allow(clippy::new_without_default)]
    pub fn new() -> Self {
        unsafe {
            let len = host::scope::size();
            let addr = Self::allocate(len);
            let data = T::build(len, addr + types::Null::byte(len), T::accessor());
            Null { addr, data }
        }
    }
}

impl<T: Series + Build> Series for self::Null<T> {
    fn addr(&self) -> usize {
        self.data.addr()
    }
    fn len(&self) -> host::DataSize {
        self.data.len()
    }
}

impl<T: Build + Accessor> Accessor for self::Null<T> {
    type Type = Option<T::Type>;
    fn set(&self, value: Self::Type) {
        if let Some(val) = value {
            unsafe { host::null::clr(self.addr) };
            self.data.set(val);
        } else {
            unsafe { host::null::set(self.addr) };
        }
    }
    fn get(&self) -> Self::Type {
        let is_null = unsafe { host::null::chk(self.addr) };
        if is_null {
            None
        } else {
            Some(self.data.get())
        }
    }
}
