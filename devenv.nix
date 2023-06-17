{ pkgs, ... }: {

  packages = with pkgs;
    [ tree jq gnused toybox ] ++ [ gnumake watchexec nmap caddy ]
    ++ [ highlight soupault minify ] ++ [ esbuild nodePackages.rollup ];

  languages.nix.enable = true;

  pre-commit.hooks = {
    editorconfig-checker.enable = true;
    lua-ls.enable = true;
    taplo.enable = true;
  };
}
