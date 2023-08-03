{ pkgs, lib, config, ... }:
with config;
with lib; {

  languages.rust = {
    enable = true;
    components = [ "rustc" "clippy" "rustfmt" "rust-analyzer" ];
    toolchain.cargo = null;
  };

  packages = with pkgs; [ knit wabt binaryen ];

  pre-commit = mkIf (!env ? CI) {
    hooks.editorconfig-checker.enable = true;
    hooks.clippy.enable = true;
    hooks.rustfmt.enable = true;
  };
}
