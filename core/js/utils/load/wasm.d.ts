declare function exports(instance: WebAssembly.Instance): WebAssembly.Exports;

export function instantiate(
  url: URL,
  imports?: WebAssembly.Imports,
): Promise<WebAssembly.Exports>;

export function compile(
  url: URL,
  imports?:
    | WebAssembly.Imports
    | ((
        getImports: () => WebAssembly.ModuleImportDescriptor[],
        getExports: () => WebAssembly.ModuleExportDescriptor[],
      ) => WebAssembly.Imports),
): Promise<WebAssembly.Exports>;
