{ pkgs, lib, config, ... }:
with config;
with lib; {

  env.JS = "deno";
  env.DENO_DIR = mkForce (env.DEVENV_ROOT + "/.cache/deno");

  languages.deno.enable = true;

  packages = with pkgs; [ gnumake watchexec ] ++ [ rome ];

  pre-commit = mkIf (!env ? CI) {
    hooks.editorconfig-checker.enable = true;
    # hooks.rome.enable = true; TODO: either wait or make PR to github:cachix/devenv
  };
}
