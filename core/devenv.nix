{ pkgs, ... }: {

  packages = with pkgs;
    [ gnumake toybox jq ] ++ [ esbuild nodePackages.rollup ];

  pre-commit = {
    hooks.editorconfig-checker.enable = true;
    # hooks.rome.enable = true; TODO: either wait or make PR to github:cachix/devenv
  };
}
