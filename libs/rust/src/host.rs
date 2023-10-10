pub type Len = u16;
pub type TypeId = i8;

pub mod null {
    use crate::types::Null;

    #[link(wasm_import_module = "nusa")]
    extern "C" {
        #[link_name = "null.noop"]
        pub fn noop();

        #[link_name = "null.set"]
        pub fn set(ptr: Null);
        #[link_name = "null.clr"]
        pub fn clr(ptr: Null);
        #[link_name = "null.chk"]
        pub fn chk(ptr: Null) -> bool;
    }
}

use crate::types::C;
C::Item_primitive!(Len);

pub mod num {
    use super::{Len, TypeId};
    use crate::types::{JSNumber, Number, C};

    pub type Setter = extern "C" fn(Number, JSNumber);
    pub type Getter = extern "C" fn(Number) -> JSNumber;

    C::Item_fn!(Setter);
    C::Item_fn!(Getter);

    #[link(wasm_import_module = "nusa")]
    extern "C" {
        #[link_name = "num.arr.noop"]
        pub fn alloc_noop();

        #[link_name = "num.allocate"]
        pub fn allocate(ty: TypeId, len: Len, nullable: bool) -> Number;

        #[cfg(target_feature = "multivalue")]
        #[link_name = "num.allocateAUTO"]
        pub fn allocateAUTO(ty: TypeId, nullable: bool) -> (Number, Len);

        #[cfg(not(target_feature = "multivalue"))]
        #[link_name = "num.cABIallocateAUTO"]
        pub fn allocateAUTO(ty: TypeId, nullable: bool) -> C::Tuple<Number, Len>;
    }

    #[link(wasm_import_module = "nusa")]
    extern "C" {
        #[link_name = "num.acc.noop"]
        pub fn accessor_noop();

        #[cfg(target_feature = "multivalue")]
        #[link_name = "num.accessor"]
        pub fn accessor(ty: TypeId) -> (Getter, Setter);

        #[cfg(not(target_feature = "multivalue"))]
        #[link_name = "num.cABIaccessor"]
        pub fn accessor(ty: TypeId) -> C::Tuple<Getter, Setter>;

        #[link_name = "num.set"]
        pub fn set(setter: Setter, ptr: Number, value: JSNumber);
        #[link_name = "num.get"]
        pub fn get(getter: Getter, ptr: Number) -> JSNumber;
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
            pub fn addVAL(ty: TypeId, len: Len, nullable: bool, this: Number, val: JSNumber);
        }
    }

    pub mod compute {
        use super::*;

        #[link(wasm_import_module = "nusa")]
        extern "C" {
            #[link_name = "num.bulk.calc.addVAL"] // TODO
            pub fn addVAL(
                ty: TypeId,
                len: Len,
                nullable: bool,
                this: Number,
                val: JSNumber,
            ) -> usize;
        }
    }
}
