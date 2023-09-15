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
        #[link_name = "null.noop"]
        pub fn noop();

        #[link_name = "null.set"]
        pub fn set(ptr: usize);
        #[link_name = "null.clr"]
        pub fn clr(ptr: usize);
        #[link_name = "null.chk"]
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
    }

    #[link(wasm_import_module = "nusa")]
    extern "C" {
        #[cfg(target_feature = "multivalue")]
        #[link_name = "num.accessor"]
        pub fn accessor(ty: TypeId) -> (Getter, Setter);

        #[cfg(not(target_feature = "multivalue"))]
        #[link_name = "num.cABIaccessor"]
        pub fn accessor(ty: TypeId) -> CTuple<*const c_void, *const c_void>;

        #[link_name = "num.set"]
        pub fn set(setter: Setter, ptr: usize, value: JSNumber);
        #[link_name = "num.get"]
        pub fn get(getter: Getter, ptr: usize) -> JSNumber;
    }

    #[link(wasm_import_module = "nusa")]
    extern "C" {
        #[link_name = "num.bulk.noop"]
        pub fn iter_noop();
    }

    pub mod mutate {
        use super::*;

        #[link(wasm_import_module = "nusa")]
        extern "C" {
            #[link_name = "num.bulk.mut.addVAL"]
            pub fn addVAL(ty: TypeId, len: u16, nullable: bool, this: usize, val: JSNumber);
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
                this: usize,
                val: JSNumber,
            ) -> host::BufAddr;
        }
    }
}