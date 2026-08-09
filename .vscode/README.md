# NextClass Android live preview

This workspace uses React, Vite, and Capacitor rather than Flutter or native Compose.

## First run

1. Open this `NextClass` folder directly in VS Code.
2. In the Caspian Emulator activity bar, launch the pre-created `NextClass_API_36` virtual device (or create another one).
3. Run **Tasks: Run Task** → **NextClass: Run Android (Live Reload)**.
4. In the Command Palette, run **Caspian: Show Emulator Screen**, then drag its tab into the editor group on the right.

If VS Code was already open during setup, restart it once so Caspian inherits the newly installed `scrcpy` command.

The task starts Vite on port 3000, then deploys the Capacitor app with `adb reverse` enabled. Saving React/CSS code updates the displayed Android WebView through Vite HMR.

## Other workflows

- **NextClass: Run Android (static build)** creates a normal debug build from `dist`; use it to verify that the packaged app does not rely on the development server.
- **NextClass: Sync Android** is useful after changing Capacitor plugins or native Android files.
- The WebNative sidebar can run and attach a JavaScript debugger to the Android WebView. Use Android Studio for native Java/Gradle debugging.

For a Wi-Fi physical device, start `npm run dev`, then use `npx cap run android --live-reload --host <your-LAN-IPv4> --port 3000` instead of the emulator task.
