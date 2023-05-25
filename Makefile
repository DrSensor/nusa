.POSIX:

BUILD_DIR ?= result
SITE_ADDR ?= localhost:3000
REPO_ADDR ?= localhost:8000


build:
	$(MAKE) -j ${BUILD_DIR}/{site,packages}
	mkdir ${BUILD_DIR}/site/npm
	$(MAKE) ${BUILD_DIR}/site/npm/{@getnusa,libnusa,nusa}

${BUILD_DIR}/site/npm/%: ${BUILD_DIR}/packages/%
	ln -rs $< $@


${BUILD_DIR}/site: ./site/
ifeq ($(CI) , true)
	soupault --verbose --build-dir $@ --profile production
else
	soupault --build-dir $@ --profile development
endif


${BUILD_DIR}/packages: ./elements/ ./libs/javascript/ ./core/
ifeq ($(CI) , true)
	rollup -c -d $@
else
	rollup -c --silent -d $@
endif
	$(MAKE) -Bj {core,libs/javascript,elements}/package.json
	rg -Fl ../@getnusa/runtime ${BUILD_DIR}/packages -t js | xargs -r sed -i "s|../@getnusa/runtime|@getnusa/runtime|"

%/package.json:
	jq -s '${package.jq}' package.json $@ > ${BUILD_DIR}/packages/`jq -r ".name" $@`/package.json

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
