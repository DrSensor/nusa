{ pkgs, lib, config, ... }:
with config;
with lib; {

  # prevent `cargo clippy` to be wrapped in `sccache` (only if exist on host system)
  env.RUSTC_WRAPPER = "";
  env.CARGO_TARGET_DIR = "${config.env.XDG_CACHE_HOME}/cargo";

  languages.rust = {
    enable = true;
    components = [ "rustc" "cargo" ]
      ++ optionals (!env ? CI) [ "clippy" "rustfmt" "rust-analyzer" ];
    toolchain = { rustc = pkgs.rustc-wasm32; };
  };

  packages = with pkgs;
    [ knit ] ++ [ wabt binaryen wasm-tools ] ++ [ llvm lld ]
    ++ [ assemblyscript ];

  pre-commit = mkIf (!env ? CI) {
    hooks.editorconfig-checker.enable = true;
    hooks.clippy.enable = true;
  };

  enterShell = mkIf (!env ? CI) ''
    knit rust-project.json Cargo.toml
    ln -rs $DEVENV_PROFILE/lib/node_modules node_modules
  '';
}
