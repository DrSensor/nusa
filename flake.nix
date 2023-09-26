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

  outputs = inputs@{ flake-parts, devenv, nixpkgs, ... }:
    with devenv.lib;
    with flake-parts.lib;
    mkFlake { inherit inputs; } {
      imports = [ devenv.flakeModule ];
      systems = [ "x86_64-linux" "aarch64-linux" "i686-linux" ]
        ++ [ "x86_64-darwin" "aarch64-darwin" ];

      perSystem = { pkgs, lib, system, ... }:
        let
          CI = { env.CI = "true"; };
          default = { config, pkgs, ... }: {
            env.XDG_CACHE_HOME = "${config.env.DEVENV_ROOT}/.cache";

            # help other CLI's to discover pinned bash
            env.SHELL = "${pkgs.bash}/bin/bash";
            packages = [ pkgs.bash ];
          };

        in with lib; rec {
          devenv.shells.nix = {
            languages.nix.enable = true;
            pre-commit.hooks = {
              nixfmt.enable = true;
              nil.enable = true;
              deadnix.enable = true;
            };
          };
          devenv.shells.javascript = ./examples/javascript/devenv.nix;
          devenv.shells.regex = ./core/regex/devenv.nix;

          devenv.shells.js-bundler = ./core/js/devenv.nix;
          devenv.shells.rust-wasm = ./core/wasm/devenv.nix;
          devenv.shells.site-generator = ./.site/devenv.nix;
          devenv.shells.web-server = ./devenv.nix;

          devShells.default = mkShell { # direnv
            inherit inputs pkgs;
            modules = with devenv.shells;
              [ default nix javascript regex ]
              ++ [ js-bundler rust-wasm site-generator web-server ]
              ++ [ check ];
          };

          # Just temporary for .github/workflows/check.yaml
          # Eventually it will perform browser test that most likely require devShells.default as a whole.
          devenv.shells.check = {
            packages = with pkgs; [ rome taplo luajitPackages.luacheck eclint ];
          };

          devShells.CI-check = mkShell {
            inherit inputs pkgs;
            modules = with devenv.shells; [ default CI ] ++ [ check ];
          };
          devShells.CI-package = mkShell {
            inherit inputs pkgs;
            modules = with devenv.shells; [ default CI ] ++ [ js-bundler ];
          };
          devShells.CI-site = mkShell {
            inherit inputs pkgs;
            modules = with devenv.shells;
              [ default CI ] ++ [ js-bundler site-generator ];
          };

          # kinda unfortunate that flake-parts doesn't provide a clean way to consume an overlay 🙁
          _module.args.pkgs = import nixpkgs {
            inherit system;
            overlays = [ (import ./overlay.nix) ];
            config = { };
          };
        };
    };
}
