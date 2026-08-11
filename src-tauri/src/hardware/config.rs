use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KioskHwConfig {
  #[serde(rename = "API_URL", default = "default_api")]
  pub api_url: String,
  #[serde(rename = "Terminal_ID", default = "default_terminal")]
  pub terminal_id: String,
  #[serde(rename = "Printer_Name", default = "default_printer_name")]
  pub printer_name: String,
  /// Linux: `/dev/usb/lp0` · Windows: `\\.\USB001` · or `auto`
  #[serde(rename = "Printer_Device", default = "default_printer_device")]
  pub printer_device: String,
  /// Linux: `/dev/ttyUSB0` · Windows: `COM3` · or `auto`
  #[serde(rename = "BillAcceptor_Port", default = "default_bill_port")]
  pub bill_acceptor_port: String,
  #[serde(rename = "CoinAcceptor_Port", default)]
  pub coin_acceptor_port: String,
  #[serde(rename = "Currency", default = "default_currency")]
  pub currency: String,
  #[serde(rename = "CurrencySymbol", default = "default_symbol")]
  pub currency_symbol: String,
  #[serde(rename = "AdminPassword", default = "default_admin_password")]
  pub admin_password: String,
}

fn default_api() -> String {
  "http://127.0.0.1:8000/api".into()
}
fn default_terminal() -> String {
  "KIOSK-001".into()
}
fn default_printer_name() -> String {
  "EPSON TM-T88V".into()
}
fn default_printer_device() -> String {
  "auto".into()
}
fn default_bill_port() -> String {
  "auto".into()
}
fn default_currency() -> String {
  "NAD".into()
}
fn default_symbol() -> String {
  "N$".into()
}
fn default_admin_password() -> String {
  "admin123".into()
}

pub fn is_windows() -> bool {
  cfg!(target_os = "windows")
}

pub fn os_default_bill_port() -> String {
  if is_windows() {
    "COM3".into()
  } else {
    "/dev/ttyUSB0".into()
  }
}

pub fn os_default_printer_device() -> String {
  if is_windows() {
    r"\\.\USB001".into()
  } else {
    "/dev/usb/lp0".into()
  }
}

pub fn is_auto_like(value: &str) -> bool {
  let v = value.trim();
  v.is_empty() || v.eq_ignore_ascii_case("auto")
}

fn is_auto(value: &str) -> bool {
  is_auto_like(value)
}

fn looks_like_windows_serial(value: &str) -> bool {
  let u = value.trim().to_ascii_uppercase();
  u.starts_with("COM") || u.starts_with(r"\\.\COM")
}

fn looks_like_unix_serial(value: &str) -> bool {
  let v = value.trim();
  v.starts_with("/dev/tty") || v.starts_with("/dev/serial")
}

fn looks_like_windows_printer(value: &str) -> bool {
  let v = value.trim();
  let u = v.to_ascii_uppercase();
  v.starts_with(r"\\.\") || u.starts_with("USB") || u.starts_with("LPT")
}

fn looks_like_unix_printer(value: &str) -> bool {
  value.trim().starts_with("/dev/usb/lp") || value.trim().starts_with("/dev/usb/")
}

/// Pick a usable serial port for the bill acceptor on this OS.
pub fn resolve_bill_port(configured: &str) -> String {
  let cfg = configured.trim();
  if !is_auto(cfg) {
    if is_windows() && looks_like_unix_serial(cfg) {
      log::warn!(
        "BillAcceptor_Port={cfg} is a Linux path on Windows — auto-detecting COM port"
      );
    } else if !is_windows() && looks_like_windows_serial(cfg) {
      log::warn!(
        "BillAcceptor_Port={cfg} is a Windows COM port on Linux — auto-detecting tty"
      );
    } else {
      return cfg.to_string();
    }
  }

  if let Some(port) = detect_serial_port() {
    log::info!("bill_port_resolved path={port}");
    return port;
  }

  let fallback = os_default_bill_port();
  log::warn!("bill_port_fallback path={fallback}");
  fallback
}

/// Candidate printer device paths for the current OS (preferred first).
pub fn printer_candidates(configured: &str) -> Vec<String> {
  let mut out = Vec::new();
  let cfg = configured.trim();
  if !is_auto(cfg) {
    let wrong_os = (is_windows() && looks_like_unix_printer(cfg))
      || (!is_windows() && looks_like_windows_printer(cfg));
    if wrong_os {
      log::warn!(
        "Printer_Device={cfg} does not match this OS — trying platform defaults"
      );
    } else {
      out.push(cfg.to_string());
    }
  }

  if is_windows() {
    for p in [
      r"\\.\USB001",
      r"\\.\USB002",
      r"\\.\USB003",
      r"\\.\USB004",
      "USB001",
      "USB002",
      "USB003",
      r"\\.\LPT1",
    ] {
      if !out.iter().any(|x| x == p) {
        out.push(p.into());
      }
    }
  } else {
    for p in ["/dev/usb/lp0", "/dev/usb/lp1", "/dev/usb/lp2"] {
      if !out.iter().any(|x| x == p) {
        out.push(p.into());
      }
    }
  }
  out
}

fn detect_serial_port() -> Option<String> {
  let ports = serialport::available_ports().ok()?;
  // Prefer USB serial adapters (typical for GBA ST2)
  for p in &ports {
    if matches!(p.port_type, serialport::SerialPortType::UsbPort { .. }) {
      return Some(p.port_name.clone());
    }
  }
  ports.into_iter().next().map(|p| p.port_name)
}

/// All serial ports to try if the preferred one fails.
pub fn bill_port_fallbacks(preferred: &str) -> Vec<String> {
  let mut out = vec![preferred.to_string()];
  if let Ok(ports) = serialport::available_ports() {
    for p in ports {
      if !out.iter().any(|x| x == &p.port_name) {
        out.push(p.port_name);
      }
    }
  }
  let os_default = os_default_bill_port();
  if !out.iter().any(|x| x == &os_default) {
    out.push(os_default);
  }
  out
}

impl Default for KioskHwConfig {
  fn default() -> Self {
    Self {
      api_url: default_api(),
      terminal_id: default_terminal(),
      printer_name: default_printer_name(),
      printer_device: default_printer_device(),
      bill_acceptor_port: default_bill_port(),
      coin_acceptor_port: String::new(),
      currency: default_currency(),
      currency_symbol: default_symbol(),
      admin_password: default_admin_password(),
    }
  }
}

impl KioskHwConfig {
  pub fn load() -> Self {
    for path in Self::candidate_paths() {
      if let Ok(raw) = fs::read_to_string(&path) {
        if let Ok(cfg) = serde_json::from_str::<KioskHwConfig>(&raw) {
          log::info!("Loaded kiosk hardware config from {}", path.display());
          return cfg;
        }
      }
    }
    log::warn!("No config.json found — using OS defaults (auto devices)");
    Self::default()
  }

  fn candidate_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
      paths.push(cwd.join("config.json"));
      paths.push(cwd.join("../config.json"));
      paths.push(cwd.join("../../config.json"));
    }
    if let Ok(exe) = std::env::current_exe() {
      if let Some(dir) = exe.parent() {
        paths.push(dir.join("config.json"));
        paths.push(dir.join("../config.json"));
      }
    }
    paths
  }
}
