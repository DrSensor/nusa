(module
	(import "env" "call" (func $call (param externref)))
	(table 16 externref)

	(func (export "tableCall") (param $index i32)
		(call $call (table.get (local.get $index)))
	)

	(func (export "tableGet") (param $index i32) (result externref)
		(table.get (local.get $index))
	)
	(func (export "tableSet") (param $index i32) (param $func externref)
		(table.set (local.get $index) (local.get $func))
	)

	(func (export "tableSize") (result i32) table.size)
	(func (export "tableGrow") (param $index i32) (param $func externref) (result i32)
		(table.grow (local.get $func) (local.get $index))
	)
)
