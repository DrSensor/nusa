ROOT_DIR := $(dir $(realpath $(lastword $(MAKEFILE_LIST))))

JS       ?= deno
ifeq ($(JS) , deno)
JSFLAGS  += --import-map=$(join ${ROOT_DIR}, deno.importmap)
endif
