declare function exports(instance: WebAssembly.Instance): WebAssembly.Exports;

declare const cache: Record<string, WebAssembly.Exports>;

export function instantiate(
  url: URL | string,
  imports?: WebAssembly.Imports,
): () => Promise<WebAssembly.Exports>;

export function compile(
  url: URL | string,
  imports?:
    | WebAssembly.Imports
    | ((
      getImports: () => WebAssembly.ModuleImportDescriptor[],
      getExports: () => WebAssembly.ModuleExportDescriptor[],
    ) => WebAssembly.Imports | Promise<WebAssembly.Imports>),
): () => Promise<WebAssembly.Exports>;
