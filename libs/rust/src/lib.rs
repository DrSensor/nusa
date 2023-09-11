pub mod iter;
pub mod number;
mod types;

trait Accessor<T> {
    fn set(self, value: T);
    fn get(self) -> T;
}

pub trait Series {
    type As;
    fn ptr(&self) -> *const Self::As;
    fn allocate(len: host::Size) -> usize;
    fn len(&self) -> host::Size;
    fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

mod host {
    pub type Size = u16;
    pub type BufAddr = usize; // buffer to store temporary array from all `host::*::compute` module 🤔

    pub mod scope {
        #[link(wasm_import_module = "nusa")]
        extern "C" {
            #[link_name = "scope.size"]
            pub fn size() -> u16;
        }
    }

    pub mod num {
        use crate::types::{ffi::CTuple, number::Type, JSNumber, Number};
        use core::ffi::c_void;
        pub type Setter = extern "C" fn(Number, JSNumber);
        pub type Getter = extern "C" fn(Number) -> JSNumber;

        #[link(wasm_import_module = "nusa")]
        #[allow(improper_ctypes)]
        extern "C" {
            #[link_name = "num.allocate"]
            pub fn allocate(ty: Type, len: u16, nullable: bool) -> Number;

            #[cfg(target_feature = "multivalue")]
            #[link_name = "num.accessor"]
            pub fn accessor(ty: Type) -> (Getter, Setter);

            #[cfg(not(target_feature = "multivalue"))]
            #[link_name = "num.cABIaccessor"]
            pub fn accessor(ty: Type) -> CTuple<*const c_void, *const c_void>;
        }

        #[link(wasm_import_module = "nusa")]
        extern "C" {
            #[link_name = "num.set"]
            pub fn set(setter: Setter, ptr: usize, value: JSNumber);
            #[link_name = "num.get"]
            pub fn get(getter: Getter, ptr: usize) -> JSNumber;
        }

        pub mod mutate {
            use super::*;

            #[link(wasm_import_module = "nusa")]
            extern "C" {
                #[link_name = "num.bulk.mut.addVAL"]
                pub fn addVAL(ty: Type, len: u16, nullable: bool, this: Number, val: JSNumber);
            }
        }

        pub mod compute {
            use super::*;
            use crate::host;

            #[link(wasm_import_module = "nusa")]
            extern "C" {
                #[link_name = "num.bulk.calc.addVAL"] // TODO
                pub fn addVAL(
                    ty: Type,
                    len: u16,
                    nullable: bool,
                    this: Number,
                    val: JSNumber,
                ) -> host::BufAddr;
            }
        }
    }
}
