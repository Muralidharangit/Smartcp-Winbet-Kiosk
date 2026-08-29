use super::config::{self, KioskHwConfig};
use super::{DeviceStatusDto, PrintTicketInput};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;

pub struct PrinterHandle {
  connected: bool,
  device_path: String,
  printer_name: String,
}

impl PrinterHandle {
  pub fn new() -> Self {
    Self {
      connected: false,
      device_path: config::os_default_printer_device(),
      printer_name: "EPSON TM-T88V".into(),
    }
  }

  pub fn status(&self) -> DeviceStatusDto {
    DeviceStatusDto {
      connected: self.connected,
      enabled: self.connected,
      mode: "live".into(),
      detail: if self.connected {
        format!("{} · {}", self.printer_name, self.device_path)
      } else {
        format!("{} · not connected ({})", self.printer_name, self.device_path)
      },
    }
  }

  pub fn connect(&mut self, cfg: &KioskHwConfig) {
    self.printer_name = cfg.printer_name.clone();
    self.device_path = cfg.printer_device.clone();

    if let Some(path) = resolve_device_path(&cfg.printer_device) {
      self.device_path = path;
      self.connected = true;
      log::info!("printer_connected path={}", self.device_path);
    } else {
      self.connected = false;
      self.device_path = if config::is_auto_like(&cfg.printer_device) {
        config::os_default_printer_device()
      } else {
        cfg.printer_device.clone()
      };
      log::error!(
        "printer_connect_failed: no writable printer near {}. {}",
        self.device_path,
        printer_help_hint()
      );
    }
  }

  pub fn print_cashout_ticket(&self, ticket: &PrintTicketInput) -> Result<bool, String> {
    if !self.connected {
      return Err(format!(
        "Printer not connected ({}). Check USB and 24V power. {}",
        self.device_path,
        printer_help_hint()
      ));
    }

    let date = chrono_like_now();
    let text = format!(
      "================================\n\
Terminal : {}\n\
Amount   : {}{:.2} {}\n\
Ticket   : {}\n\
Date     : {}\n\
================================\n\
 Scan this ticket on any kiosk\n\
 to continue with this balance.\n\
================================",
      ticket.terminal_id,
      ticket.currency_symbol,
      ticket.amount,
      ticket.currency,
      ticket.code,
      date
    );

    let code: String = ticket
      .code
      .chars()
      .filter(|c| (*c as u32) >= 0x20 && (*c as u32) <= 0x7e)
      .collect();
    let mut code128 = Vec::from(b"{B" as &[u8]);
    code128.extend_from_slice(code.as_bytes());

    let mut payload: Vec<u8> = Vec::new();
    payload.extend_from_slice(&[0x1b, 0x40]);
    payload.extend_from_slice(&[0x1b, 0x61, 0x01]);
    payload.extend_from_slice(&[0x1b, 0x45, 0x01]);
    payload.extend_from_slice(b"CREDIT TICKET\n");
    payload.extend_from_slice(&[0x1b, 0x45, 0x00]);
    payload.extend_from_slice(&[0x1b, 0x61, 0x00]);
    payload.extend_from_slice(text.as_bytes());
    payload.push(b'\n');

    // Module 2 fits 80 mm TM-T88V. Module 3 clipped the bars so tickets would not scan.
    // New tickets are 9 chars (T + 8 hex), so width 2 is easier to read than the old 13-char codes.
    payload.extend_from_slice(b"\n");
    payload.extend_from_slice(&[0x1b, 0x61, 0x01]);
    payload.extend_from_slice(&[0x1d, 0x68, 96]);
    payload.extend_from_slice(&[0x1d, 0x77, 2]);
    payload.extend_from_slice(&[0x1d, 0x66, 0]);
    payload.extend_from_slice(&[0x1d, 0x48, 2]);
    payload.extend_from_slice(&[0x1d, 0x6b, 73, code128.len() as u8]);
    payload.extend_from_slice(&code128);
    payload.push(b'\n');
    payload.extend_from_slice(&[0x1b, 0x64, 0x04]);
    payload.extend_from_slice(&[0x1d, 0x56, 0x41, 0x04]);

    let path = resolve_device_path(&self.device_path).unwrap_or_else(|| self.device_path.clone());
    write_raw(&path, &payload)?;
    log::info!("ticket_printed code={} path={}", ticket.code, path);
    Ok(true)
  }

  pub fn print_test_slip(&self) -> Result<bool, String> {
    if !self.connected {
      return Err(format!(
        "Printer not connected ({}). Check USB and 24V. {}",
        self.device_path,
        printer_help_hint()
      ));
    }
    let mut payload: Vec<u8> = Vec::new();
    payload.extend_from_slice(&[0x1b, 0x40]);
    payload.extend_from_slice(&[0x1b, 0x61, 0x01]);
    payload.extend_from_slice(&[0x1b, 0x45, 0x01]);
    payload.extend_from_slice(b"HARDWARE TEST\n");
    payload.extend_from_slice(&[0x1b, 0x45, 0x00]);
    payload.extend_from_slice(&[0x1b, 0x61, 0x00]);
    payload.extend_from_slice(b"================================\n");
    payload.extend_from_slice(b"This is NOT a cash-out ticket.\n");
    payload.extend_from_slice(b"Printer, USB and lp/USB permission OK.\n");
    payload.extend_from_slice(b"================================\n");
    payload.extend_from_slice(&[0x1b, 0x64, 0x04]);
    payload.extend_from_slice(&[0x1d, 0x56, 0x41, 0x04]);
    let path = resolve_device_path(&self.device_path).unwrap_or_else(|| self.device_path.clone());
    write_raw(&path, &payload)?;
    log::info!("test_slip_printed path={}", path);
    Ok(true)
  }
}

/// Path the printer driver would use (exists or writable).
pub fn diagnose_printer_path(configured: &str) -> Option<String> {
  resolve_device_path(configured)
}

fn printer_help_hint() -> &'static str {
  if config::is_windows() {
    r#"Windows: install Epson as USB printer, set Printer_Device to \\.\USB001 (or auto). Ensure 24V power."#
  } else {
    "Linux: plug Epson USB+24V; sudo usermod -aG lp $USER then log out/in. Device usually /dev/usb/lp0."
  }
}

fn resolve_device_path(preferred: &str) -> Option<String> {
  let candidates = config::printer_candidates(preferred);
  // Prefer a path we can open for write (Windows device nodes often fail Path::exists)
  for p in &candidates {
    if OpenOptions::new().write(true).open(p).is_ok() {
      return Some(p.clone());
    }
  }
  // Linux: exists but not writable — still return so connect can report permission clearly
  if !config::is_windows() {
    for p in &candidates {
      if Path::new(p).exists() {
        return Some(p.clone());
      }
    }
  }
  None
}

fn write_raw(path: &str, payload: &[u8]) -> Result<(), String> {
  let mut file = OpenOptions::new()
    .write(true)
    .open(path)
    .map_err(|e| map_io_err(path, e))?;
  file.write_all(payload).map_err(|e| map_io_err(path, e))?;
  let _ = fs::metadata(path);
  Ok(())
}

fn map_io_err(path: &str, err: std::io::Error) -> String {
  let msg = err.to_string();
  if msg.contains("Permission denied") || err.kind() == std::io::ErrorKind::PermissionDenied {
    if config::is_windows() {
      format!(
        "Printer permission denied ({path}). Run the kiosk as a user that can open the USB printer port, or reinstall as Generic/Text Only on USB00x."
      )
    } else {
      format!(
        "Printer permission denied ({path}). Run: sudo usermod -aG lp $USER then log out/in."
      )
    }
  } else if err.kind() == std::io::ErrorKind::NotFound {
    "Epson not found. Check USB cable and 24V PS-180 power.".into()
  } else {
    format!("Printer error ({path}): {msg}")
  }
}

fn chrono_like_now() -> String {
  use std::time::{SystemTime, UNIX_EPOCH};
  let secs = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|d| d.as_secs())
    .unwrap_or(0);
  let days = secs / 86400;
  let tod = secs % 86400;
  let h = tod / 3600;
  let m = (tod % 3600) / 60;
  let mut y = 1970u32;
  let mut rem = days;
  loop {
    let diy = if is_leap(y) { 366 } else { 365 };
    if rem < diy {
      break;
    }
    rem -= diy;
    y += 1;
  }
  let months = [31u64, if is_leap(y) { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let mut mo = 1u32;
  for d in months {
    if rem < d {
      break;
    }
    rem -= d;
    mo += 1;
  }
  let day = rem + 1;
  format!("{y:04}-{mo:02}-{day:02} {h:02}:{m:02}")
}

fn is_leap(y: u32) -> bool {
  (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}
