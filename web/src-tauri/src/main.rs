// Prevents a second console window from opening on Windows release builds.
// Harmless on macOS but kept for portability if you later add a Windows target.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    kiuq_website_system_lib::run()
}
