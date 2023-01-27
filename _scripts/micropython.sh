VER=master
OUT=_vendor

# download source code
mkdir -p $OUT
wget -c "https://github.com/micropython/micropython/archive/refs/heads/master.tar.gz" -O - | tar -xz -C $OUT
# wget -c "https://github.com/micropython/micropython/releases/download/v$VER/micropython-$VER.tar.xz" -O - | tar -xJ -C $OUT

pushd $OUT/micropython-$VER/mpy-cross
  make
popd
# pushd $OUT/micropython-$VER/ports/javascript // older version
pushd $OUT/micropython-$VER/ports/webassembly
  make
popd
