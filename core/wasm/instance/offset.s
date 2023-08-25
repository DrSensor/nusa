	.import_module	offset, env
	.import_name	offset, offset
	.globaltype	offset, i32

	.hidden	get_offset
	.globl	get_offset
get_offset:
	.functype	get_offset () -> (i32)
	global.get	offset
	end_function

	.hidden	set_offset
	.globl	set_offset
set_offset:
	.functype	set_offset (i32) -> ()
	local.get	0
	global.set	offset
	end_function
