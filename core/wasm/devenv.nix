{ pkgs, lib, config, ... }:
with config;
with lib; {

  env.CARGO_TARGET_DIR = "${config.env.XDG_CACHE_HOME}/cargo";

  languages.rust = with pkgs.rust-bin.stable.latest; {
    enable = true;
    components = [ "rustc" "cargo" ]
      ++ optionals (!env ? CI) [ "clippy" "rustfmt" "rust-analyzer" ];
    toolchain = {
      inherit cargo rust-src;
      rustc = minimal.override { targets = [ "wasm32-unknown-unknown" ]; };
    } // optionalAttrs (!env ? CI) { inherit clippy rustfmt rust-analyzer; };
  };

  packages = with pkgs; [ knit wabt binaryen ];

  pre-commit = mkIf (!env ? CI) {
    hooks.editorconfig-checker.enable = true;
    hooks.clippy.enable = true;
    hooks.rustfmt.enable = true;
  };

  enterShell = mkIf (!env ? CI) ''
    knit rust-project.json
    knit ${./Cargo.toml}
  '';
}