{ pkgs, ... }: {

  env.JS = "deno";
  languages.deno.enable = true;

  packages = with pkgs; [ gnumake watchexec ] ++ [ rome ];

  pre-commit.hooks.editorconfig-checker.enable = true;
  # pre-commit.hooks.rome.enable = true; TODO: either wait or make PR to github:cachix/devenv
}
