(module
	(table 16 funcref)

	(type $dispatch (func))
	(func (export "call") (param $index i32)
		(call_indirect (type $dispatch) (local.get $index))
	)

	(func (export "get") (param $index i32) (result funcref)
		(table.get (local.get $index))
	)
	(func (export "set") (param $index i32) (param $func funcref)
		(table.set (local.get $index) (local.get $func))
	)

	(func (export "size") (result i32) table.size)
	(func (export "grow") (param $index i32) (param $func funcref) (result i32)
		(table.grow (local.get $func) (local.get $index))
	)
)
