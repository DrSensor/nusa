{ pkgs, lib, config, ... }:
with config;
with lib; {

  env.JS = "deno";
  env.DENO_DIR = mkForce (env.DEVENV_ROOT + "/.cache/deno");

  languages.deno.enable = true; # to render page.jsx as page.html

  packages = with pkgs;
    [ soupault minify ] ++ [ gnumake highlight ] ++ [ jq coreutils ];

  pre-commit = mkIf (!env ? CI) {
    hooks.editorconfig-checker.enable = true;
    hooks.luacheck.enable = true;
    hooks.taplo.enable = true;
  };
}
