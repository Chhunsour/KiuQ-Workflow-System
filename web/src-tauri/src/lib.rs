// KiuQ Website System — Tauri v2 entry point.
//
// The desktop app is a thin native shell around the existing Vue/Vite
// frontend. We deliberately keep the Rust side minimal so future shell
// upgrades (auto-update, deep links, native notifications) are additive
// rather than rewrites.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
