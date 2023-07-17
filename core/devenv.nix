{ pkgs, lib, config, ... }:
with config;
with lib; {

  packages = with pkgs;
    [ gnumake toybox jq ] ++ [ esbuild nodePackages.rollup ];

  pre-commit = mkIf (!env ? CI) {
    hooks.editorconfig-checker.enable = true;
    # hooks.rome.enable = true; TODO: either wait or make PR to github:cachix/devenv
  };
}
