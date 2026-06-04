# App icons

This folder must contain the macOS `.icns`, Windows `.ico`, and PNG icons
the Tauri bundler references in `tauri.conf.json`.

Generate them automatically from your existing logo by running this once
from the **`web/`** directory:

```bash
npx tauri icon ../web/public/kiuq-logo.png
```

That command writes:

- `icons/32x32.png`
- `icons/128x128.png`
- `icons/128x128@2x.png`
- `icons/icon.icns` (the macOS bundle icon)
- `icons/icon.ico` (kept for portability)
- plus assorted iOS/Android sizes (harmless, ignored on macOS builds)

The source `kiuq-logo.png` already exists at `web/public/kiuq-logo.png`.
You only need to re-run the command if the logo changes.

`tauri dev` and `tauri build` will fail until this command is run.
