_final: prev: {
  lld = prev.lld_16;
  llvm = prev.llvm_16;

  rome = prev.biome; # override pre-commit.hooks.rome to use biome
}
