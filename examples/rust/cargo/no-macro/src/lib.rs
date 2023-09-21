use libnusa::{number, Accessor};
use std::sync::OnceLock;

#[derive(Default)]
struct This {
    count: number::u8,
}
static THIS: OnceLock<This> = OnceLock::new();

#[no_mangle]
fn constructor() {
    let _ = THIS.set(This::default());
}

#[no_mangle]
fn set_count(value: u8) {
    if let Some(this) = THIS.get() {
        this.count.set(value);
    }
}

#[no_mangle]
fn get_count() -> u8 {
    if let Some(this) = THIS.get() {
        this.count.get()
    } else {
        unreachable!()
    }
}

#[no_mangle]
fn increment() {
    if let Some(this) = THIS.get() {
        this.count.set(this.count.get() + 1)
    } else {
        unreachable!()
    }
}
