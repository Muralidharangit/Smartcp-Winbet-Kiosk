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

## Windows notes

1. **Bill acceptor** — Device Manager → Ports (COM & LPT). Set `BillAcceptor_Port` to that COM (e.g. `COM3`) if auto is wrong.  
2. **Epson** — USB + 24V. Prefer a raw USB port (`\\.\USB001`). Generic/Text Only driver helps ESC/POS.  
3. Restart the Tauri app after plugging devices.

API default in this product: `http://127.0.0.1:8000/api`.
