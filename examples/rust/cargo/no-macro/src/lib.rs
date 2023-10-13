use libnusa::{number, Accessor};

#[derive(Default)]
struct This {
    count: number::u8,
}

thread_local! {
    static THIS: This = This {
        count: number::u8::prop_name("count"),
    };
}

#[no_mangle]
fn increment() {
    THIS.with(|this| {
        this.count.set(this.count.get() + 1);
    })
}
