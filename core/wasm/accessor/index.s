	.import_module	index, env
	.import_name	index, index
	.globaltype	index, i32

	.hidden	current_index
	.globl	current_index
current_index:
	.functype	current_index () -> (i32)
	global.get	index
	end_function

	.section	.text.at,"",@
	.globl	at
	.type	at,@function
at:
	.functype	at (i32) -> ()
	local.get	0
	global.set	index
	end_function
