mod index;
mod types;

use index::current as index;
use types::Null;

#[export_name = "null.set"]
unsafe fn set_null(this: Null) {
    *nullptr(this) |= 1 << index()
}

#[export_name = "null.clr"]
unsafe fn clear_null(this: Null) {
    *nullptr(this) &= !(1 << index())
}

#[export_name = "null.chk"]
unsafe fn check_null(this: Null) -> bool {
    ((*nullptr(this) >> index()) & 1) != 0
}

unsafe fn nullptr(this: Null) -> *mut isize {
    let offset = (index() as f32 / isize::BITS as f32).floor() as usize;
    (this.addr as *mut isize).add(offset)
}
