{ pkgs, ... }: {

  packages = with pkgs; [ tree toybox ] ++ [ gnumake watchexec nmap caddy ];

  pre-commit = { hooks.editorconfig-checker.enable = true; };
}
