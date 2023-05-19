.POSIX:

BUILD_DIR ?= result
SITE_ADDR ?= localhost:3000
REPO_ADDR ?= localhost:8000


build: site/
ifeq ($(CI) , true)
	soupault --verbose --build-dir ${BUILD_DIR}/site --profile production
else
	@soupault --build-dir ${BUILD_DIR}/site --profile development
endif


pretty:
	caddy fmt --overwrite


serve:
	SITE=${SITE_ADDR} REPO=${REPO_ADDR} caddy run
