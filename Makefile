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

TEMP.fifo := $(shell mktemp -u).fifo
%.fifo:
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
