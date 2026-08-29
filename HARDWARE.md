# Hardware — Linux & Windows

`config.json` defaults use **`auto`** so the same build works on both OSes.

| Setting | Linux | Windows | Auto |
|---------|-------|---------|------|
| `BillAcceptor_Port` | `/dev/ttyUSB0` | `COM3` (or first USB serial) | Scans serial ports |
| `Printer_Device` | `/dev/usb/lp0` | `\\.\USB001` | Tries OS candidates |
| Barcode scanner | HID keyboard wedge | Same | No config |

## Examples

- `config.linux.example.json` — explicit Linux paths  
- `config.windows.example.json` — explicit Windows paths  

Copy one over `config.json` if auto-detect picks the wrong device.

## Linux permissions

```bash
sudo usermod -aG lp,dialout $USER
# log out / in
```

On a new PC, in the kiosk app press **Ctrl+Shift+D**, password `admin123` (or `AdminPassword` in `config.json`). That runs group/device checks plus Print / Scan / Bill tests. Live cash-in is paused while the panel is open.

## Windows notes

1. **Bill acceptor** — Device Manager → Ports (COM & LPT). Set `BillAcceptor_Port` to that COM (e.g. `COM3`) if auto is wrong.  
2. **Epson** — USB + 24V. Prefer a raw USB port (`\\.\USB001`). Generic/Text Only driver helps ESC/POS.  
3. Restart the Tauri app after plugging devices.

API default in this product: `http://127.0.0.1:8000/api`.
