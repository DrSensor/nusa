.POSIX:
SHELL := bash
.SHELLFLAGS = -O globstar -O extglob -c

BUILD_DIR ?= result
SITE_ADDR ?= localhost:3000
REPO_ADDR ?= localhost:8000
VERSION   ?= $(shell jq -r ".version" package.json)


build:
	$(MAKE) -j $(BUILD_DIR)/{site,packages}
	$(MAKE) $(BUILD_DIR)/site/npm/{@getnusa/runtime,libnusa,nusa}
ifeq ($(CI), true)
	tree $(BUILD_DIR) -h
endif


$(BUILD_DIR)/site/npm/%: $(BUILD_DIR)/packages/%
	[ ! -d $@ ] && mkdir -p $(dir $@)
	ln -rs $< $@


$(BUILD_DIR)/site: soupault.toml site/* .site/* .site/*/* examples/*/* examples/*/*/*
ifeq ($(CI) , true)
	soupault --verbose --build-dir $@ --profile production
	minify -r $(BUILD_DIR)/site/ -o $(BUILD_DIR)/
else
	soupault --build-dir $@ --profile development
	minify -r $(BUILD_DIR)/site/!(npm) -o $(BUILD_DIR)/site
endif # BUG(nixpkgs): minify v2.11.1 (old) doesn't have --quiet flag


$(BUILD_DIR)/packages: nusa/* nusa/*/* nusa/*/*/* libs/javascript/* core/js/* core/js/*/*
ifeq ($(CI) , true)
	rollup -c -d $@
	esbuild --mangle-props=[^_]_$$ --mangle-cache=core/js/props.json --minify --format=esm $@/**/*.js --outdir=$@ --allow-overwrite
else
	rollup -c --silent -d $@
	esbuild --mangle-props=[^_]_$$ --mangle-cache=core/js/props.json --minify --log-level=warning --format=esm $@/**/*.js --outdir=$@ --allow-overwrite
endif
	$(MAKE) -Bj {core/js,libs/javascript,nusa}/package.json
# TODO: generate $@/package.json{workspaces} to simplify npm publish

%/package.json:
	$(eval PKG_NAME := $(shell jq -r ".name" $@))
	sed -i "s|../$(PKG_NAME)|$(PKG_NAME)|" $$(find $(BUILD_DIR)/packages -path $(BUILD_DIR)/packages/$(PKG_NAME) -prune -o -name "*.js" -print)
	jq -s '$(package.jq)' package.json $@ > $(BUILD_DIR)/packages/$(PKG_NAME)/package.json

define package.jq
.[0] + .[1] | del(.workspace) | \
if .name != "@getnusa/runtime" then \
	.dependencies."@getnusa/runtime" = "$(VERSION)" \
else . end
endef


.SILENT: pretty
pretty:
	eclint -fix
	caddy fmt --overwrite
	taplo format **.toml
	rome format core/js/ nusa/ libs/javascript/ examples/javascript/ rollup.config.mjs tsconfig.json rome.json package.json .luarc.json --write


check:
	$(MAKE) -k check-js check-lua check-toml check-editorconfig
check-js:
ifeq ($(CI) , true)
	rome check core/js/ nusa/ libs/javascript/ examples/javascript/ rollup.config.mjs
else
	rome check core/js/ nusa/ libs/javascript/ examples/javascript/ rollup.config.mjs --colors force
endif
check-toml:
ifeq ($(CI) , true)
	taplo lint **.toml
else
	taplo lint **.toml --colors always
endif
check-lua:
	luacheck .site/
check-editorconfig:
ifeq ($(CI) , true)
	eclint
else
	eclint -color always
endif


fix: fix-js
fix-js:
	rome check --apply core/js/ nusa/ libs/javascript/ examples/javascript/ rollup.config.mjs


run: pretty build
	$(MAKE) -j livereload.sock watch-{site,packages} serve-{all,javascript-examples}

reload:
	echo -e "event: reload\ndata:\n" | tee `cat livereload.fifo`

serve-all:
	SITE=$(SITE_ADDR) REPO=$(REPO_ADDR) caddy run

serve-%-examples: examples/%/server.* examples/%/Makefile
	$(MAKE) -C examples/$* run

watch-site:
	watchexec -p -w site/ -w .site/ -w soupault.toml "make $(BUILD_DIR)/site reload"

watch-packages:
	watchexec -p -w core/js -w libs/javascript/ -w nusa/ -w rollup.config.js "make $(BUILD_DIR)/packages reload"


%.sock:
	trap "rm $*.{sock,fifo}" INT HUP TERM; \
	ncat -lUk $@ -c "$(MAKE) -Bk $*.fifo"

%.fifo:
	$(eval TEMP.fifo := $(shell mktemp -u).fifo)
	@mkfifo $(TEMP.fifo)
	@echo $(TEMP.fifo) >> $@
	$(info $(SSE.http))
	tail -F $(TEMP.fifo)

define SSE.http
HTTP/1.1 200 OK
Connection: keep-alive
Content-Type: text/event-stream


endef


ifndef VERBOSE
MAKEFLAGS += --no-print-directory
endif
