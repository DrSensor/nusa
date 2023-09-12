mod null;
mod types;

pub mod iter;
pub mod number;
pub use null::Null;

pub trait Accessor {
    type Type;
    fn set(&self, value: Self::Type);
    fn get(&self) -> Self::Type;
}

pub trait Series {
    type As;
    fn ptr(&self) -> *const Self::As;
    fn len(&self) -> host::DataSize;
    fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

#[allow(clippy::missing_safety_doc)]
pub trait Build {
    const TYPE_ID: i8;
    type Accessor;
    unsafe fn accessor() -> Self::Accessor;
    unsafe fn allocate(len: host::DataSize) -> usize;
    unsafe fn build(len: host::DataSize, addr: usize, accessor: Self::Accessor) -> Self;
}

mod host {
    pub type DataSize = u16;
    pub type BufAddr = usize; // buffer to store temporary array from all `host::*::compute` module 🤔
    pub type TypeId = i8;

    pub mod scope {
        #[link(wasm_import_module = "nusa")]
        extern "C" {
            #[link_name = "scope.size"]
            pub fn size() -> u16;
        }
    }

    pub mod null {
        #[link(wasm_import_module = "nusa")]
        extern "C" {
            #[link_name = "beNULL"]
            pub fn set(ptr: usize);
            #[link_name = "unNULL"]
            pub fn clr(ptr: usize);
            #[link_name = "isNULL"]
            pub fn chk(ptr: usize) -> bool;
        }
    }

    pub mod num {
        use super::TypeId;
        use crate::types::{ffi::CTuple, JSNumber, Number};
        use core::ffi::c_void;

        pub type Setter = extern "C" fn(Number, JSNumber);
        pub type Getter = extern "C" fn(Number) -> JSNumber;

        #[link(wasm_import_module = "nusa")]
        extern "C" {
            #[link_name = "num.allocate"]
            pub fn allocate(ty: TypeId, len: u16, nullable: bool) -> Number;

            #[cfg(target_feature = "multivalue")]
            #[link_name = "num.accessor"]
            pub fn accessor(ty: TypeId) -> (Getter, Setter);

            #[cfg(not(target_feature = "multivalue"))]
            #[link_name = "num.cABIaccessor"]
            pub fn accessor(ty: TypeId) -> CTuple<*const c_void, *const c_void>;
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
                pub fn addVAL(ty: TypeId, len: u16, nullable: bool, this: Number, val: JSNumber);
            }
        }

        pub mod compute {
            use super::*;
            use crate::host;

            #[link(wasm_import_module = "nusa")]
            extern "C" {
                #[link_name = "num.bulk.calc.addVAL"] // TODO
                pub fn addVAL(
                    ty: TypeId,
                    len: u16,
                    nullable: bool,
                    this: Number,
                    val: JSNumber,
                ) -> host::BufAddr;
            }
        }
    }
}
