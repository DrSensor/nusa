extern "C" {
    #[link_name = "set_offset"]
    pub fn set(byte: usize);

    #[link_name = "get_offset"]
    pub fn get() -> usize;
}
