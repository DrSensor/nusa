.POSIX:

BUILD_DIR ?= result


build: site/
ifeq ($(CI) , true)
	soupault --verbose --build-dir ${BUILD_DIR}/site --profile production
else
	@soupault --build-dir ${BUILD_DIR}/site --profile development
endif
