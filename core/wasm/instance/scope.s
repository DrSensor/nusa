	.import_module	scopeSize, env
	.import_name	scopeSize, scopeSize
	.globaltype	scopeSize, i32

	.hidden	scope_size
	.globl	scope_size
scope_size:
	.functype	scope_size () -> (i32)
	global.get	scopeSize
	end_function
