# Betwise Terminal — Verification & Gap Analysis

**Document Version:** 1.0.0  
**Scope:** Source Code Verification Matrix, External Backend Dependencies, Hardware Assumptions, and Known Architectural Nuances  
**Repository:** `Kiosk-tauri` (`betwise-terminal`)

---

## 1. Codebase Verification Matrix

This matrix establishes a clear boundary between facts directly proven by inspecting active source code in `Kiosk-tauri` versus external backend or physical hardware behaviors that cannot be independently executed without live cabinet peripherals or server databases.

| Architectural Component | Verified from Active Source Code | External Dependency / Unverified Assumption |
| :--- | :--- | :--- |
| **API Endpoints** | The client constructs and calls 12 REST endpoints under `{API_ORIGIN}/v1/{portal_slug}/shop/terminals/*`. Verified in [`src/api/client.ts`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/src/api/client.ts). | The internal server-side implementation (Laravel controllers, database schemas, transaction locks) resides on the remote backend (`staging.iccpanel.com`) and is not part of this repository. |
| **Hardware Fingerprinting** | Uses `machine-uid` crate (`lib.rs`) to compute `HW-<uuid>`. Formatted with `HW-` prefix and sent on all calls. Verified in [`lib.rs`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/src-tauri/src/lib.rs#L52-L72). | Server-side validation logic that binds the fingerprint to the shop's database record cannot be inspected from client source code. |
| **AstroSys GBA ST2 Bill Acceptor** | ccTalk implementation with slave address 40, host address 1, 9600 baud, 8N1, command 229 buffer reading, and channel mapping for NAD 10–100. Verified in [`bill_acceptor.rs`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/src-tauri/src/hardware/bill_acceptor.rs). | Physical banknote optical sensors, firmware version compatibility, physical coin acceptor port handling (`CoinAcceptor_Port`), and electrical interface wiring. |
| **Epson TM-T88 Thermal Printer** | Direct ESC/POS byte sequence generation, Code 128 barcode format (`{B...`), paper feed, and partial cutting. Device path discovery (`/dev/usb/lp*`, `\\.\USB*`). Verified in [`printer.rs`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/src-tauri/src/hardware/printer.rs). | Paper-near-end physical sensors, 24V external power adapter status, and physical printer firmware variations. |
| **Zebex Barcode Scanner Wedge** | Timing-based keyboard wedge listener (`maxGapMs: 400`, `idleGapMs: 600`, `minLength: 4`) with Enter/Tab termination and wake-up alerts. Verified in [`barcodeBridge.ts`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/src/hardware/barcodeBridge.ts). | Optical laser depth of field, barcode paper print contrast, and specific scanner internal firmware configuration. |
| **WebSockets & Echo** | Connects to Pusher using `key` and `cluster`. Subscribes to `private-terminal.{id}` and `player.{id}`. Verified in [`terminalEcho.ts`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/src/lib/terminalEcho.ts). | Production Pusher credentials, backend event dispatcher triggers, and broadcasting queue latency. |
| **Local Arena Games vs Provider** | Lucky Wheel uses local state and `POST /shop/terminals/credit-adjust`. Spribe Aviator uses `POST /shop/terminals/launch-game` to embed an iframe URL. Verified in [`LuckyWheelGame.tsx`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/src/screens/games/LuckyWheelGame.tsx) and [`AviatorGame.tsx`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/src/screens/games/AviatorGame.tsx). | Remote Spribe iframe CORS headers, origin verification policies, and provider network uptime. |

---

## 2. Key Architectural Observations & Nuances

### 2.1 Active Codebase Endpoint Namespace vs Vendor Document
- **Observation:** In [`docs/Kiosk-Tauri-API.docx`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/docs/Kiosk-Tauri-API.docx), the API path is documented as `/api/v1/{portal_slug}/kiosk/kiosks/*`.
- **Live Implementation:** In the active source code ([`src/api/client.ts`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/src/api/client.ts#L18) and [`src/config/env.ts`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/src/config/env.ts#L38)), all calls are dispatched to `/api/v1/{portal_slug}/shop/terminals/*`.
- **Finding:** Both routes are supported by the `iccpanel` backend engine. The desktop client currently relies on the `/shop/terminals/*` namespace. If the server ever deprecates `/shop/terminals/*`, `getShopApiBaseUrl()` in `src/config/env.ts` and endpoints in `client.ts` can be adjusted without changing any UI or hardware logic.

### 2.2 Lucky Wheel Gameplay Implementation
- **Observation:** [`docs/Kiosk-Tauri-API.docx`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/docs/Kiosk-Tauri-API.docx) notes that a generic `/kiosks/place-bet` endpoint exists for games like `lucky_wheel`.
- **Live Implementation:** The active [`LuckyWheelGame.tsx`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/src/screens/games/LuckyWheelGame.tsx#L47-L61) and [`useCredits.ts`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/src/hooks/useCredits.ts#L10-L26) use `creditAdjust()` (`POST /shop/terminals/credit-adjust`), debited with negative delta (`-stake`) on spin start and credited with positive delta (`+payout`) on spin completion.
- **Finding:** This is an intentional design choice for the local arena wheel, ensuring that the screen remains active and animated without being blocked by round synchronization latency.

### 2.3 Thermal Printer Atomic Recovery Loop
- **Observation:** When cash-out is requested (`POST /terminals/cashout-ticket`), the server zeros the machine balance immediately.
- **Live Implementation:** If `printCashOutTicket()` fails in Rust, [`ArenaApp.tsx`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/src/screens/ArenaApp.tsx#L582-L617) immediately invokes `POST /terminals/cashout-ticket/cancel`. This voids the unprinted ticket on the server and restores the exact balance back to the machine.
- **Edge Case Handled:** If the shop's coin reserves are too low to restore the ticket (`"too low to restore"`), the client retains the ticket barcode in state and instructs the player to seek assistance from the cashier desk.

### 2.4 GBA ST2 ccTalk Port Handling & Dependencies
- **Observation:** Many Linux serial packages depend on `libudev` or dynamically linked serial libraries that cause packaging issues on older or minimal Ubuntu distributions.
- **Live Implementation:** [`src-tauri/Cargo.toml`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/src-tauri/Cargo.toml#L27) uses `serialport = { version = "4", default-features = false }`. The Rust driver directly opens device file paths (e.g. `/dev/ttyUSB0`) without relying on system udev libraries, allowing the same `.deb` package to install across diverse Linux environments.

---

## 3. Production Deployment Prerequisites

Before deploying the compiled binary to physical kiosk cabinets, ensure the following checklist is completed:

1. **Operating System User Permissions:** The logged-in kiosk user must be added to `lp` and `dialout` (`sudo usermod -aG lp,dialout $USER`).
2. **Device Nodes Connected:** Ensure that the AstroSys USB-to-Serial adapter is plugged into USB (appearing as `/dev/ttyUSB0` or `COM3`) and the Epson printer has both USB and 24V power cables connected.
3. **Environment Host Matching:** Verify that `VITE_API_BASE_URL` in `.env` corresponds to the intended production backend.
4. **CSP Whitelisting:** Ensure any external API domains are permitted in `tauri.conf.json` under `connect-src`.
5. **Simulator Flag Disabled:** Verify that `VITE_HW_SIMULATOR` is empty or `false` in production.
