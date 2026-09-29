// napi-build sets the platform link flags a Node addon needs (on macOS: -undefined dynamic_lookup, so the
// N-API symbols resolve against the node process that loads the .node file).
fn main() {
    napi_build::setup();
}
