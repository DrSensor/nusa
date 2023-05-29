.POSIX:
.SHELLFLAGS = -O globstar -O extglob -c

BUILD_DIR ?= result
SITE_ADDR ?= localhost:3000
REPO_ADDR ?= localhost:8000


build:
	$(MAKE) -j ${BUILD_DIR}/{site,packages}
	$(MAKE) ${BUILD_DIR}/site/npm/{@getnusa/runtime,libnusa,nusa}


${BUILD_DIR}/site/npm/%: ${BUILD_DIR}/packages/%
	[ ! -d $@ ] && mkdir -p $(dir $@)
	ln -rs $< $@


${BUILD_DIR}/site: site/*
ifeq ($(CI) , true)
	soupault --verbose --build-dir $@ --profile production
	minify -r ${BUILD_DIR}/site/ -o ${BUILD_DIR}/
else
	soupault --build-dir $@ --profile development
	minify -qr ${BUILD_DIR}/site/ -o ${BUILD_DIR}/
endif


${BUILD_DIR}/packages: elements/* libs/javascript/* core/* core/*/*
ifeq ($(CI) , true)
	rollup -c -d $@
	esbuild --mangle-props=[^_]_$$ --mangle-cache=core/props.json --minify --format=esm $@/**/*.js --outdir=$@ --allow-overwrite
else
	rollup -c --silent -d $@
	esbuild --mangle-props=[^_]_$$ --mangle-cache=core/props.json --minify --log-level=warning --format=esm $@/**/*.js --outdir=$@ --allow-overwrite
endif
	$(MAKE) -Bj {core,libs/javascript,elements}/package.json

%/package.json:
	$(eval PKG_NAME := $(shell jq -r ".name" $@))
	sed -i "s|../${PKG_NAME}|${PKG_NAME}|" $$(find ${BUILD_DIR}/packages -path ${BUILD_DIR}/packages/${PKG_NAME} -prune -o -name "*.js" -print)
	jq -s '${package.jq}' package.json $@ > ${BUILD_DIR}/packages/${PKG_NAME}/package.json

define package.jq
.[0] + .[1] | del(.workspace) | \
if .name != "@getnusa/runtime" then \
	.dependencies."@getnusa/runtime" = .version \
else . end
endef


pretty:
	caddy fmt --overwrite


run: pretty build
	$(MAKE) -j livereload.sock watch-site watch-packages serve

reload:
	echo -e "event: reload\ndata:\n" | tee `cat livereload.fifo`

serve:
	SITE=${SITE_ADDR} REPO=${REPO_ADDR} caddy run

watch-site:
	watchexec -p -w site/ -w .site/ -w soupault.toml "make ${BUILD_DIR}/site reload"
	
watch-packages:
	watchexec -p -w core/ -w libs/javascript/ -w elements/ -w rollup.config.js "make ${BUILD_DIR}/packages reload"


%.sock:
	trap "rm $*.{sock,fifo}" INT HUP TERM; \
	ncat -lUk $@ -c "$(MAKE) -Bk $*.fifo"

%.fifo:
	$(eval TEMP.fifo := $(shell mktemp -u).fifo)
	@mkfifo ${TEMP.fifo}
	@echo ${TEMP.fifo} >> $@
	$(info $(SSE.http))
	tail -F ${TEMP.fifo}

define SSE.http
HTTP/1.1 200 OK
Connection: keep-alive
Content-Type: text/event-stream


endef


ifndef VERBOSE
MAKEFLAGS += --no-print-directory
endif
