mod hardware;
mod kiosk_lock;

use hardware::{
  get_kiosk_hw_config, hardware_diagnose, hardware_start, hardware_status, print_cashout_ticket,
  print_test_ticket, set_shop_available_coins, HardwareState,
};
use kiosk_lock::{enter_kiosk_mode, exit_kiosk_mode};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(HardwareState::new())
    .invoke_handler(tauri::generate_handler![
      get_device_fingerprint,
      get_operating_system,
      hardware_start,
      hardware_status,
      hardware_diagnose,
      get_kiosk_hw_config,
      set_shop_available_coins,
      print_cashout_ticket,
      print_test_ticket,
      enter_kiosk_mode,
      exit_kiosk_mode,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      match hardware::start_hardware(app.handle()) {
        Ok(status) => log::info!(
          "hardware_started bill={} printer={}",
          status.bill.connected,
          status.printer.connected
        ),
        Err(err) => log::error!("hardware_start_failed: {err}"),
      }
      // Fullscreen kiosk on start
      kiosk_lock::engage(app.handle());
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn get_device_fingerprint() -> Result<String, String> {
  #[cfg(not(target_os = "android"))]
  {
    machine_uid::get()
      .map(|id| format!("HW-{}", id))
      .map_err(|error| error.to_string())
  }

  #[cfg(target_os = "android")]
  {
    let brand = std::env::var("RO_PRODUCT_BRAND").unwrap_or_else(|_| "android".into());
    let model = std::env::var("RO_PRODUCT_MODEL").unwrap_or_else(|_| "device".into());
    let serial = std::env::var("RO_SERIALNO").unwrap_or_else(|_| "unknown".into());
    Ok(format!(
      "HW-ANDROID-{}-{}-{}",
      brand.replace(' ', "_"),
      model.replace(' ', "_"),
      serial.replace(' ', "_")
    ))
  }
}

#[tauri::command]
fn get_operating_system() -> String {
  if cfg!(target_os = "windows") {
    "Windows".to_string()
  } else if cfg!(target_os = "macos") {
    "macOS".to_string()
  } else if cfg!(target_os = "android") {
    "Android".to_string()
  } else if cfg!(target_os = "linux") {
    "Linux".to_string()
  } else {
    "Unknown".to_string()
  }
}
