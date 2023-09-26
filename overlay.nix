_final: prev: {
  lld = prev.lld_16;
  llvm = prev.llvm_16;

  # TODO: override stdenv to use toybox instead of GNU coreutils
}
