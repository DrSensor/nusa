export const memory = new WebAssembly.Memory({ initial: 1 });

const muti32 = () => new WebAssembly.Global({ mutable: true, value: "i32" });
export const offset = muti32(),
  index = muti32(),
  scopeSize = muti32();
