.POSIX:
.ONESHELL:
SELF_DIR := $(dir $(realpath $(lastword $(MAKEFILE_LIST))))
include $(join $(SELF_DIR), ../../env.mk)


%.jsx:
ifeq ($(JS) , deno)
	$(JS) run $(JSFLAGS) --allow-read --allow-net - << 'EOF'
else
	$(JS) $(JSFLAGS) << 'EOF'
endif
	console.log(page + "")
	import page from "./$@"
	EOF
