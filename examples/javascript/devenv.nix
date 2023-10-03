{ pkgs, lib, config, ... }:
with config;
with lib; {

  env.JS = "deno";
  env.DENO_DIR = mkForce (env.DEVENV_ROOT + "/.cache/deno");

  languages.deno.enable = true;

  packages = with pkgs; [ gnumake watchexec ];

  pre-commit = mkIf (!env ? CI) {
    hooks.editorconfig-checker.enable = true;
    hooks.denofmt.enable = true;
    hooks.denolint.enable = true;
  };
}
