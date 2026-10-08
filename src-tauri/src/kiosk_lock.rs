use crate::hardware::config::KioskHwConfig;
use crate::hardware::HardwareState;
use tauri::{AppHandle, Manager};

/// Enter fullscreen kiosk mode on launch.
pub fn engage(app: &AppHandle) {
  if let Some(win) = app.get_webview_window("main") {
    let _ = win.set_resizable(false);
    let _ = win.set_fullscreen(true);
    let _ = win.set_decorations(false);
    let _ = win.set_always_on_top(true);
    let _ = win.set_minimizable(false);
    let _ = win.set_closable(false);
    let _ = win.set_focus();
    log::info!("kiosk_lockdown_engaged");
  }
}

#[tauri::command]
pub fn enter_kiosk_mode(app: AppHandle) -> Result<bool, String> {
  engage(&app);
  Ok(true)
}

/// Staff exit: Ctrl+Shift+K then AdminPassword from config.json
#[tauri::command]
pub fn exit_kiosk_mode(app: AppHandle, password: String) -> Result<bool, String> {
  let state = app.state::<HardwareState>();
  {
    let mut guard = state.config.lock().map_err(|e| e.to_string())?;
    *guard = KioskHwConfig::load();
  }
  let expected = state
    .config
    .lock()
    .map_err(|e| e.to_string())?
    .admin_password
    .clone();

  if password != expected {
    return Err("Incorrect password.".into());
  }

  if let Some(win) = app.get_webview_window("main") {
    let _ = win.set_always_on_top(false);
    let _ = win.set_fullscreen(false);
    let _ = win.set_decorations(true);
    let _ = win.set_resizable(true);
    let _ = win.set_minimizable(true);
    let _ = win.set_closable(true);
    let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize {
      width: 1280.0,
      height: 800.0,
    }));
    let _ = win.center();
    log::info!("kiosk_lockdown_exited");
  }
  Ok(true)
}
