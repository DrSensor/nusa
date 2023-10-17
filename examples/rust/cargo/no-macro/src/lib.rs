use libnusa::{number, Accessor, Null};

struct Counter {
    count: number::u8,
    tick: Null<number::f32>,
}
impl Counter {
    fn increment(&self) {
        self.count.set(self.count.get() + 1);
        self.tick.set(None);
    }
}

///////////////// using unsafe MaybeUninit //////////////////
use core::mem::MaybeUninit;
static mut THIS: MaybeUninit<Counter> = MaybeUninit::uninit();

#[export_name = "ns.init"]
unsafe fn main() {
    THIS.write(Counter {
        count: number::u8::prop_name("count"),
        tick: Null::prop_name("tick"),
    });
}

#[no_mangle]
unsafe fn increment() {
    THIS.assume_init_ref().increment()
}
/////////////////////////////////////////////////////////////

////////////////// using unsafe mut Option //////////////////
// static mut THIS: Option<Counter> = None;

// #[export_name = "ns.init"]
// unsafe fn main() {
//     THIS = Some(Counter {
//         count: number::u8::prop_name("count"),
//         tick: Null::prop_name("tick"),
//     });
// }

// #[no_mangle]
// unsafe fn increment() {
//     if let Some(this) = &THIS {
//         this.increment()
//     }
// }
///////////////////////////////////////////////////////////////

////////////// using TLS (Thread Local Storage) //////////////
// thread_local! {
//     static THIS: Counter = Counter {
//         count: number::u8::prop_name("count"),
//         tick: Null::prop_name("tick"),
//     };
// }

// #[no_mangle]
// fn increment() {
//     THIS.with(|this| this.increment())
// }
/////////////////////////////////////////////////////////////

///////////////////// using TLS in Cell /////////////////////
// use core::cell::Cell;
// thread_local! {
//     static THIS: Cell<Counter> = panic!();
// }

// #[export_name = "ns.init"]
// fn main() {
//     THIS.set(Counter {
//         count: number::u8::prop_name("count"),
//         tick: Null::prop_name("tick"),
//     });
// }

// #[no_mangle]
// fn increment() {
//     THIS.get().increment();
// }
/////////////////////////////////////////////////////////////

/////////////////// using OnceLock ////////////////////////////
// use std::sync::OnceLock;
// static THIS: OnceLock<Counter> = OnceLock::new();

// #[export_name = "ns.init"]
// fn main() {
//     let _ = THIS.set(Counter {
//         count: number::u8::prop_name("count"),
//         tick: Null::prop_name("tick"),
//     });
// }

// #[no_mangle]
// fn increment() {
//     if let Some(this) = THIS.get() {
//         this.increment()
//     }
// }
///////////////////////////////////////////////////////////////
