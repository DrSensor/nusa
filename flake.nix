{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    devenv = {
      url = "github:cachix/devenv";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    flake-parts = {
      url = "github:hercules-ci/flake-parts";
      inputs.nixpkgs-lib.follows = "nixpkgs";
    };
  };

  outputs = inputs@{ flake-parts, devenv, ... }:
    with devenv.lib;
    with flake-parts.lib;
    mkFlake { inherit inputs; } {
      imports = [ devenv.flakeModule ];
      systems = [ "x86_64-linux" "aarch64-linux" "i686-linux" ]
        ++ [ "x86_64-darwin" "aarch64-darwin" ];

      perSystem = { pkgs, lib, ... }:
        let
          CI = rec {
            env.CI = "true";
            env.SHELL = "${pkgs.bash}/bin/bash"; # help other cli
            env.MAKESHELL = env.SHELL;
          };
        in with lib; rec {
          devenv.shells.nix = {
            languages.nix.enable = true;
            pre-commit.hooks = {
              nixfmt.enable = true;
              nil.enable = true;
              statix.enable = true;
              deadnix.enable = true;
            };
          };
          devenv.shells.javascript = ./examples/javascript/devenv.nix;

          devenv.shells.js-bundler = ./core/devenv.nix;
          devenv.shells.site-generator = ./.site/devenv.nix;
          devenv.shells.web-server = ./devenv.nix;

          devShells.default = mkShell { # direnv
            inherit inputs pkgs;
            modules = with devenv.shells;
              [ nix javascript ] ++ [ js-bundler site-generator web-server ];
          };

          # Just temporary for .github/workflows/check.yaml
          # Eventually it will perform browser test that most likely require devShells.default as a whole.
          devenv.shells.check = {
            packages = with pkgs; [ rome taplo luajitPackages.luacheck eclint ];
          };

          devShells.CI-check = mkShell {
            inherit inputs pkgs;
            modules = with devenv.shells; [ CI check ];
          };
          devShells.CI-package = mkShell {
            inherit inputs pkgs;
            modules = with devenv.shells; [ CI js-bundler ];
          };
          devShells.CI-site = mkShell {
            inherit inputs pkgs;
            modules = with devenv.shells; [ CI js-bundler site-generator ];
          };
        };
    };
}
