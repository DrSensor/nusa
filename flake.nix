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

      perSystem = { pkgs, ... }: rec {
        devenv.shells.javascript = ./examples/javascript/devenv.nix;
        devenv.shells.js-bundler = ./core/devenv.nix;
        devenv.shells.site-generator = ./.site/devenv.nix;
        devenv.shells.web-server = ./devenv.nix;
        devShells.default = mkShell {
          inherit inputs pkgs;
          modules = [
            devenv.shells.javascript
            devenv.shells.js-bundler
            devenv.shells.site-generator
            devenv.shells.web-server
            {
              languages.nix.enable = true;
              pre-commit.hooks = {
                nixfmt.enable = true;
                nil.enable = true;
                statix.enable = true;
                deadnix.enable = true;
              };
            }
          ];
        };
        devShells.CI = mkShell {
          inherit inputs pkgs;
          modules = [
            { env.CI = "true"; }
            devenv.shells.js-bundler
            devenv.shells.site-generator
          ];
        };
      };
    };
}
