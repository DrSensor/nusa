.POSIX:
.ONESHELL:
.DELETE_ON_ERROR:
include ../../env.mk

SITE_ADDR ?= localhost:5745


%.html: %.jsx
	$(MAKE) -Bsf $(join ${ROOT_DIR}, .site/processors/jsx2html.mk) $< > $@


run:
ifeq ($(JS) , bun)
	$(JS) run $(JSFLAGS) --hot ./server.js
else

ifeq ($(JS) , deno)
	$(JS) run $(JSFLAGS) --allow-read --allow-net - << 'EOF'
	import { serve } from "https://deno.land/std/http/server.ts"
	serve( app.fetch, { port: ${SITE_PORT}, hostname: "${SITE_HOST}" })
else ifeq ($(JS) , node)
	$(JS) $(JSFLAGS) << 'EOF'
	import { serve } from '@hono/node-server'
	serve({ fetch: app.fetch, port: ${SITE_PORT}, hostname: "${SITE_HOST}" })
endif
	import app from "./server.js"
	EOF

endif

run: SITE_HOST := $(firstword $(subst :, ,$(SITE_ADDR)))
run: SITE_PORT := $(lastword $(subst :, ,$(SITE_ADDR)))
