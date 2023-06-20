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

  outputs = inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ inputs.devenv.flakeModule ];
      systems = [ "x86_64-linux" "aarch64-linux" "i686-linux" ]
        ++ [ "x86_64-darwin" "aarch64-darwin" ];

      perSystem = { pkgs, lib, system, config, ... }:
        let
          inputs' = inputs // { inherit pkgs lib system config; };

          # recursiveMerge = with lib; foldr recursiveUpdate;
          # WARNING: lib.attrsets.recursiveUpdate can't merge [packages]
          recursiveMerge = with lib;
            let
              f = path:
                zipAttrsWith (name: values:
                  if length values == 1 then
                    head values
                  else if all isList values then
                    unique (concatLists values)
                  else if all isAttrs values then
                    f (path ++ [ name ]) values
                  else
                    last values);
            in f [ ];

        in rec {
          devenv.shells.default = recursiveMerge [
            devenv.shells.javascript
            (import ./devenv.nix inputs')
          ];

          devenv.shells.javascript =
            import ./examples/javascript/devenv.nix inputs';
        };
    };
}
