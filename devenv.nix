{ pkgs, lib, config, ... }:
with config;
with lib; {

  packages = with pkgs; [ tree toybox ] ++ [ gnumake watchexec nmap caddy ];

  pre-commit = mkIf (!env ? CI) { hooks.editorconfig-checker.enable = true; };
}
