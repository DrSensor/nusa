_final: prev: {
  knit = prev.buildGoModule rec {
    pname = "knit";
    version = "1.1.1";
    src = prev.fetchFromGitHub {
      owner = "zyedidia";
      repo = "knit";
      rev = "v${version}";
      hash = "sha256-zxwEJnQZpOEJhV7jx2ClS3XmMfGBiq8AHR26TOIBJVw=";
    };
    subPackages = [ "cmd/knit" ];
    ldflags = [ "-s -w -X github.com/zyedidia/knit/info.Version=${version}" ];
    vendorHash = "sha256-+IZFydwchHIMIvYmIgZ0uJKjW4aVBFuj3SQk58I0z/g=";
  };

  # TODO: override stdenv to use toybox instead of GNU coreutils
}
