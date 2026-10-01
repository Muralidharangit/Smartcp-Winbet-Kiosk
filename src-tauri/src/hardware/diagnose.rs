//! New-device hardware checklist: groups, device nodes, USB, live handles.

use super::config::{self, KioskHwConfig};
use super::{DeviceStatusDto, HardwareState};
use serde::Serialize;
use std::fs;
use std::fs::OpenOptions;
use std::path::Path;
use std::process::Command;
use std::time::Duration;

#[derive(Clone, Serialize)]
pub struct DiagnoseCheck {
  pub id: String,
  pub name: String,
  pub ok: bool,
  pub detail: String,
}

#[derive(Clone, Serialize)]
pub struct DiagnoseReport {
  pub os: String,
  pub user: String,
  pub groups: Vec<String>,
  pub checks: Vec<DiagnoseCheck>,
}

fn check(id: &str, name: &str, ok: bool, detail: impl Into<String>) -> DiagnoseCheck {
  DiagnoseCheck {
    id: id.into(),
    name: name.into(),
    ok,
    detail: detail.into(),
  }
}

pub fn run(state: &HardwareState) -> DiagnoseReport {
  let cfg = state.config.lock().ok().map(|g| g.clone()).unwrap_or_else(KioskHwConfig::default);
  let (user, groups) = current_user_groups();
  let mut checks = Vec::new();

  if config::is_windows() {
    checks.push(check(
      "groups",
      "User groups",
      true,
      "Windows — no lp/dialout groups. Run the kiosk as a user that can open COM and USB printer ports.",
    ));
  } else {
    let has_lp = groups.iter().any(|g| g == "lp");
    let has_dialout = groups.iter().any(|g| g == "dialout");
    let ok = has_lp && has_dialout;
    let detail = if ok {
      format!("lp and dialout present ({})", groups.join(" "))
    } else {
      format!(
        "Need lp + dialout. Now: [{}]. Run: sudo usermod -aG lp,dialout {} && log out/in (or reboot).",
        groups.join(" "),
        if user.is_empty() { "$USER" } else { &user }
      )
    };
    checks.push(check("groups", "Linux groups (lp, dialout)", ok, detail));
  }

  let printer_path = super::printer::diagnose_printer_path(&cfg.printer_device);
  match printer_path {
    Some(path) => {
      let exists = Path::new(&path).exists() || config::is_windows();
      let writable = OpenOptions::new().write(true).open(&path).is_ok();
      checks.push(check(
        "printer_device",
        "Printer device",
        exists,
        if exists {
          format!("{path}")
        } else {
          format!("{path} not found. Plug Epson USB + 24V.")
        },
      ));
      checks.push(check(
        "printer_write",
        "Printer permission",
        writable,
        if writable {
          format!("Can write {path}")
        } else if exists {
          format!("Permission denied on {path}. Linux: add user to lp, then log out/in.")
        } else {
          "Cannot open printer.".into()
        },
      ));
    }
    None => {
      checks.push(check(
        "printer_device",
        "Printer device",
        false,
        "No printer path. Plug Epson USB + 24V, set Printer_Device to auto.",
      ));
      checks.push(check(
        "printer_write",
        "Printer permission",
        false,
        "Skipped — no device.",
      ));
    }
  }

  let bill_port = config::resolve_bill_port(&cfg.bill_acceptor_port);
  let bill_exists = Path::new(&bill_port).exists() || config::is_windows();
  checks.push(check(
    "bill_device",
    "Bill acceptor port",
    bill_exists || config::is_windows(),
    if bill_exists || config::is_windows() {
      bill_port.clone()
    } else {
      format!("{bill_port} not found. Plug GBA USB serial; set BillAcceptor_Port to auto.")
    },
  ));

  let bill_live = state
    .bill
    .lock()
    .ok()
    .map(|b| b.status())
    .unwrap_or(DeviceStatusDto {
      connected: false,
      enabled: false,
      mode: "offline".into(),
      detail: "unavailable".into(),
    });
  let bill_open = bill_live.connected || try_open_serial(&bill_port);
  checks.push(check(
    "bill_open",
    "Bill acceptor serial",
    bill_open,
    if bill_live.connected {
      bill_live.detail
    } else if bill_open {
      format!("Opened {bill_port}")
    } else {
      format!("Cannot open {bill_port}. Linux: add user to dialout, then log out/in.")
    },
  ));

  let printer_live = state
    .printer
    .lock()
    .ok()
    .map(|p| p.status())
    .unwrap_or(DeviceStatusDto {
      connected: false,
      enabled: false,
      mode: "offline".into(),
      detail: "unavailable".into(),
    });
  checks.push(check(
    "printer_live",
    "Printer handle",
    printer_live.connected,
    printer_live.detail,
  ));

  if !config::is_windows() {
    let usb = lsusb_text();
    let epson = usb.to_lowercase().contains("epson") || usb.contains("04b8");
    checks.push(check(
      "usb_epson",
      "USB Epson",
      epson,
      if epson {
        "Epson USB device present".to_string()
      } else {
        "No Epson in lsusb (id 04b8). Check USB + 24V.".to_string()
      },
    ));

    let hid = linux_hid_scanner();
    checks.push(check(
      "usb_scanner",
      "HID barcode scanner",
      hid.0,
      hid.1,
    ));
  } else {
    checks.push(check(
      "usb_epson",
      "USB Epson",
      printer_live.connected,
      "Windows: Device Manager → Universal Serial Bus / Ports. Live printer handle used as proxy.",
    ));
    checks.push(check(
      "usb_scanner",
      "HID barcode scanner",
      true,
      "Windows: click Scan test. Scanner is a keyboard wedge (not probed here).",
    ));
  }

  DiagnoseReport {
    os: if config::is_windows() {
      "Windows".into()
    } else {
      "Linux".into()
    },
    user,
    groups,
    checks,
  }
}

fn current_user_groups() -> (String, Vec<String>) {
  let user = std::env::var("USER")
    .or_else(|_| std::env::var("USERNAME"))
    .unwrap_or_default();
  if config::is_windows() {
    return (user, Vec::new());
  }
  let names = Command::new("id")
    .args(["-nG"])
    .output()
    .ok()
    .filter(|o| o.status.success())
    .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
    .unwrap_or_default();
  let groups = names
    .split_whitespace()
    .map(|s| s.to_string())
    .collect();
  (user, groups)
}

fn lsusb_text() -> String {
  Command::new("lsusb")
    .output()
    .ok()
    .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
    .unwrap_or_default()
}

fn linux_hid_scanner() -> (bool, String) {
  let raw = fs::read_to_string("/proc/bus/input/devices").unwrap_or_default();
  let lower = raw.to_lowercase();
  if lower.contains("barcode") || lower.contains("zebex") || lower.contains("ultrascan") {
    let name = raw
      .lines()
      .find(|l| l.starts_with("N: Name=") && l.to_lowercase().contains("barcode"))
      .unwrap_or("HID barcode keyboard");
    return (true, name.trim().to_string());
  }
  (false, "No barcode HID in /proc/bus/input/devices. Plug the scanner USB.".into())
}

fn try_open_serial(path: &str) -> bool {
  serialport::new(path, 9600)
    .timeout(Duration::from_millis(50))
    .open()
    .is_ok()
}
