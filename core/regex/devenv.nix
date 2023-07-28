{ pkgs, lib, config, ... }:
with config;
with lib; {

  packages = with pkgs; [ knit pomsky ];

  pre-commit = mkIf (!env ? CI) { hooks.editorconfig-checker.enable = true; };
}
