.POSIX:
.ONESHELL:
.DELETE_ON_ERROR:
include ../../env.mk


%.html: %.jsx
	$(MAKE) -Bsf $(join ${ROOT_DIR}, .site/processors/jsx2html.mk) $< > $@
