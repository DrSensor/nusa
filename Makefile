.POSIX:

BUILD_DIR ?= result
SITE_ADDR ?= localhost:3000
REPO_ADDR ?= localhost:8000

build:
	$(MAKE) -j ${BUILD_DIR}/{site,packages}


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
pretty:
	caddy fmt --overwrite


run: pretty build
	$(MAKE) -j livereload.sock watch serve

reload: build
	echo -e "event: reload\ndata:\n" | tee `cat livereload.fifo`

serve:
	SITE=${SITE_ADDR} REPO=${REPO_ADDR} caddy run

watch:
	watchexec -p -w site/ -w .site/ -w soupault.toml "make reload"


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
