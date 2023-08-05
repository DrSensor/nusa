{ pkgs, lib, config, ... }:
with config;
with lib; {

  languages.rust = {
    enable = true;
    components = [ "rustc" "clippy" "rustfmt" "rust-analyzer" ];
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
