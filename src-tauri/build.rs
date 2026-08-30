fn main() {
    println!("cargo:rustc-link-lib=framework=AVFoundation");
    tauri_build::build()
}
