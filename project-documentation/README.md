# Betwise Terminal (Kiosk Tauri) — System Documentation Master Index

**Document Version:** 1.0.0  
**Project Name:** `betwise-terminal` (Tauri Desktop Kiosk Application)  
**Package Version:** `0.1.0`  
**Frontend Framework:** React 19.2.7 + TypeScript ~6.0.2 + Vite 8.1.1  
**Desktop Runtime:** Tauri v2.11.3 / @tauri-apps/api 2.11.1 (Rust 2021)  
**Target Environments:** Linux (Ubuntu/Debian POS Cabinets) & Windows 10/11 POS Terminals  
**Primary Backend API:** `https://staging.iccpanel.com/api` (Shop & Kiosk API Endpoints)  
**Default Currency:** Namibian Dollar (`NAD` / `N$`)

---

## 1. Executive Summary

**Betwise Terminal** is an enterprise-grade, fullscreen physical kiosk betting terminal application built using **Tauri v2** and **React 19**. It is designed to run unattended inside physical gaming shops and betting parlors on dedicated Linux/Windows hardware cabinets.

The terminal enables retail players to:
1. **Insert Physical Cash Notes:** Insert banknotes (NAD 10, 20, 50, 100, 200) into an AstroSys GBA ST2 bill acceptor to immediately receive digital betting credit on the kiosk screen.
2. **Redeem Barcode Vouchers (Ticket-In):** Scan optical barcode tickets (printed from this or any other kiosk in the same betting shop portal) using a laser barcode scanner wedge to credit the kiosk balance.
3. **Play Instant & Provider Games:** Launch certified provider games (such as Spribe Aviator) within an integrated fullscreen sandboxed iframe or wager on local interactive games (Lucky Wheel, Roulette, Coin Flip, Dice Roll).
4. **Print Cash-Out Tickets (Ticket-Out):** Cash out winnings or remaining balances instantly by generating a cryptographically registered Code 128 barcode voucher on an integrated Epson TM-T88 thermal receipt printer.
5. **Fail-Safe Ticket Reversal:** If the physical printer runs out of paper, jams, or loses power during cash-out, the terminal automatically invokes an atomic cancellation API endpoint to void the unprinted ticket and restore the player's balance to the machine screen.

---

## 2. Documentation Suite Navigation

The complete system documentation has been organized into specialized modules inside [`project-documentation/`](./):

| Document | Description & Key Topics |
| :--- | :--- |
| **[SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)** | Multi-process Tauri architecture, Rust hardware layer, IPC commands, security boundaries, and runtime life cycle. |
| **[PAGE_FLOWS_AND_ROUTES.md](./PAGE_FLOWS_AND_ROUTES.md)** | Comprehensive screen inventory, route definitions, visual progression diagrams, zero-balance locking, and all 7 modal dialogs. |
| **[API_SPECIFICATION_AND_BACKEND_INTEGRATIONS.md](./API_SPECIFICATION_AND_BACKEND_INTEGRATIONS.md)** | Full specification of all 12 REST endpoints across `/shop/terminals/*` and `/kiosk/kiosks/*`, request/response payloads, and hardware authentication. |
| **[WEBSOCKET_AND_REALTIME_EVENTS.md](./WEBSOCKET_AND_REALTIME_EVENTS.md)** | Pusher/Laravel Echo WebSocket pipeline, channel authorizers, cashier load events, balance broadcasts, and HTTP fallback polling. |
| **[HARDWARE_COMMUNICATION_AND_SECURITY.md](./HARDWARE_COMMUNICATION_AND_SECURITY.md)** | Hardware driver integration (GBA ST2 ccTalk, Epson ESC/POS, Zebex HID barcode wedge), keyboard locking policy, and staff administrative gates. |
| **[STATE_MANAGEMENT_AND_DATA_CONTRACTS.md](./STATE_MANAGEMENT_AND_DATA_CONTRACTS.md)** | Zustand machine store, LocalStorage schema, hardware atomic states, TypeScript contracts, and data models. |
| **[BUILD_PACKAGING_AND_DEPLOYMENT.md](./BUILD_PACKAGING_AND_DEPLOYMENT.md)** | Vite & Cargo compilation, Ubuntu `.deb` packaging, Windows NSIS packaging, OS permission configuration (`lp`, `dialout`), and deployment guides. |
| **[VERIFICATION_AND_GAP_ANALYSIS.md](./VERIFICATION_AND_GAP_ANALYSIS.md)** | Source code verification matrix distinguishing verified facts from external backend assumptions and unverified dependencies. |

---

## 3. High-Level System Architecture Diagram

```mermaid
flowchart TB
    subgraph Physical Cabinet Hardware
        BA["💵 Bill Acceptor\n(AstroSys GBA ST2\nccTalk 9600 8N1)"]
        PR["🖨️ Thermal Receipt Printer\n(Epson TM-T88V\nESC/POS Direct Device)"]
        SC["📟 Barcode Scanner\n(Zebex Z-5160 / Ultrascan\nHID Keyboard Wedge)"]
    end

    subgraph Desktop Kiosk Application (Tauri v2)
        subgraph Rust Core Process (src-tauri)
            MAIN["main.rs / lib.rs\n(Tauri Runtime & Builder)"]
            LOCK["kiosk_lock.rs\n(Window Lockdown / Fullscreen)"]
            HW_MOD["hardware/mod.rs\n(HardwareState Mutex Hub)"]
            HW_BA["hardware/bill_acceptor.rs\n(ccTalk Driver & Serial Thread)"]
            HW_PR["hardware/printer.rs\n(Raw ESC/POS Driver & Code128)"]
            HW_DIAG["hardware/diagnose.rs\n(Hardware Health & Group Checks)"]
            HW_CFG["hardware/config.rs\n(config.json Parser & OS Paths)"]
        end

        subgraph IPC Bridge
            INVOKE["Tauri Commands (invoke)"]
            EVENTS["Tauri Events (listen/emit)"]
        end

        subgraph React 19 Frontend Webview (src)
            STORE["Zustand Store\n(sessionStore.ts - useMachine)"]
            ROUTER["HashRouter\n(ArenaApp.tsx)"]
            CLIENT["API Client\n(client.ts)"]
            WEDGE["Barcode Bridge\n(barcodeBridge.ts)"]
            ECHO["Laravel Echo / Pusher\n(terminalEcho.ts)"]
            LOBBY["Betting Lobby & Catalog\n(BettingLobby.tsx / catalog.ts)"]
            GAMES["Game Panels\n(ProviderGamePanel / GamePlayPanel)"]
        end
    end

    subgraph Remote Cloud Backend (iccpanel)
        API["🌐 REST API\n(https://staging.iccpanel.com/api)"]
        PUSHER["⚡ Pusher WebSocket Service\n(ap2 cluster)"]
    end

    BA <-->|Serial ccTalk Port| HW_BA
    HW_PR -->|Raw Device Bytes| PR
    SC -->|Keystroke Stream| WEDGE

    MAIN --> LOCK
    MAIN --> HW_MOD
    HW_MOD --> HW_BA
    HW_MOD --> HW_PR
    HW_MOD --> HW_DIAG
    HW_MOD --> HW_CFG

    HW_MOD <--> INVOKE <--> CLIENT
    HW_BA -->|note-accepted / note-rejected| EVENTS --> STORE
    HW_PR -->|hardware-error| EVENTS --> STORE
    WEDGE -->|Scanned Barcode String| STORE

    CLIENT <-->|HTTPS REST JSON\n(machine_id + device_fingerprint)| API
    ECHO <-->|WSS Auth & Events\n(terminal.{id} / player.{id})| PUSHER
```

---

## 4. Key Repository Files & Directories

```text
Kiosk-tauri/
├── config.json                     # Runtime kiosk hardware and operational configuration
├── config.linux.example.json       # Example configuration for Linux (/dev/ttyUSB0, /dev/usb/lp0)
├── config.windows.example.json     # Example configuration for Windows (COM3, \\.\USB001)
├── HARDWARE.md                     # Operational hardware quick-reference guide
├── package.json                    # Node dependencies, scripts, build tasks
├── vite.config.ts                  # Vite 8 config with custom logger middleware & chunk setup
├── index.html                      # HTML entry with viewport lock, FontAwesome, Poppins font
├── docs/
│   └── Kiosk-Tauri-API.docx        # Vendor API reference document for kiosk endpoints
├── scripts/
│   ├── build-linux-deb.sh          # Bash script to compile Ubuntu .deb installer
│   ├── build-windows-from-ubuntu.sh# Cross-compiles Windows NSIS setup.exe via cargo-xwin
│   ├── setup-linux.sh              # Ubuntu system setup (dependencies, groups)
│   └── FIX-APT.md                  # APT package manager troubleshooting guide
├── src-tauri/
│   ├── Cargo.toml                  # Rust dependencies (tauri 2.11, serialport 4, machine-uid)
│   ├── tauri.conf.json             # Tauri window, security CSP, and bundle configuration
│   └── src/
│       ├── main.rs                 # Tauri application bootstrap entry
│       ├── lib.rs                  # Native commands, fingerprint generator, OS detector
│       ├── kiosk_lock.rs           # Kiosk lockdown mode (fullscreen, always-on-top, exit lock)
│       └── hardware/
│           ├── mod.rs              # Hardware state container & IPC dispatchers
│           ├── bill_acceptor.rs    # GBA ST2 ccTalk serial driver implementation
│           ├── printer.rs          # Epson TM-T88 direct ESC/POS printer driver
│           ├── config.rs           # JSON configuration loader and port auto-detection
│           └── diagnose.rs         # Diagnostic checklist for groups and device permissions
├── src/
│   ├── App.tsx                     # Top-level state router (Registration vs ArenaApp)
│   ├── main.tsx                    # React 19 root bootstrap
│   ├── api/
│   │   └── client.ts               # Complete HTTP client for all kiosk endpoints
│   ├── config/
│   │   └── env.ts                  # Environment variables, portal slug, Pusher configuration
│   ├── hardware/
│   │   └── barcodeBridge.ts        # Keyboard wedge parser with idle wake detection
│   ├── lib/
│   │   ├── storage.ts              # LocalStorage wrapper & live fingerprint bridge
│   │   ├── hardware.ts             # Typed wrappers for Tauri hardware commands & events
│   │   ├── terminalEcho.ts         # Pusher-JS & Laravel Echo connection with custom authorizer
│   │   ├── useTerminalRealtime.ts  # React hook for private terminal & player channel events
│   │   └── demoTicket.ts           # SVG/HTML digital ticket generator for simulation
│   ├── services/
│   │   └── sessionStore.ts         # Zustand store (`useMachine`) for balance & alerts
│   ├── hooks/
│   │   ├── useCredits.ts           # Credit adjust hook for local arena games
│   │   └── useShopProviders.ts     # Provider catalog and pagination manager
│   ├── screens/
│   │   ├── ArenaApp.tsx            # Main shell, route table, hardware event coordinator
│   │   ├── HomeScreen.tsx          # Alias to GamesLobby
│   │   ├── GamesLobby.tsx          # Game selection hub with categories, search, slider
│   │   ├── RegistrationScreen.tsx  # Initial 19-char setup token & virtual keyboard
│   │   ├── RegistrationSuccessScreen.tsx # Post-registration confirmation
│   │   ├── CashInsertedScreen.tsx  # Fullscreen cash-in success with countdown
│   │   ├── CashOutScreen.tsx       # Printable voucher review screen
│   │   ├── SplashScreen.tsx        # Branded kiosk bootloader splash
│   │   ├── UnauthorizedScreen.tsx  # Hardware mismatch / unbind security alert
│   │   └── games/
│   │       ├── AviatorGame.tsx     # Spribe Aviator iframe loader
│   │       └── LuckyWheelGame.tsx  # Interactive local multi-segment wheel
│   ├── components/
│   │   ├── ArenaShell.tsx          # Header bar, balance display, cash-out button
│   │   ├── BettingLobby.tsx        # High-performance catalog grid with tabs & pagination
│   │   ├── GamePlayPanel.tsx       # Local wagering game interface (cards/dice/roulette)
│   │   ├── ProviderGamePanel.tsx   # Provider iframe container with header overlay
│   │   ├── CashOutConfirmModal.tsx # Confirmation modal before ticket generation
│   │   ├── ZeroBalanceModal.tsx    # "Please Insert Money" prompt on 0 credit
│   │   ├── KioskAlert.tsx          # Centralized error/warning/retry alert modal
│   │   ├── HardwareLabPanel.tsx    # Simulation overlay (Ctrl+Shift+H)
│   │   ├── HardwareTestGate.tsx    # Diagnostic test panel (Ctrl+Shift+D)
│   │   └── StaffExitGate.tsx       # Admin exit lockdown gate (Ctrl+Shift+K)
│   └── styles/
│       ├── global.css              # Theme tokens, layout variables, typography
│       ├── kiosk.css               # Kiosk modal cards, digital ticket, animations
│       ├── theme.css               # Accent themes and visual styles
│       └── responsive.css          # Touchscreen cabinet responsive overrides
```

---

## 5. Security & Isolation Summary

1. **Hardware-Tied Authentication:** Every request transmits `device_fingerprint` derived from system hardware identifiers (`machine-uid` in Rust) alongside `machine_id`. If cloned to unauthorized hardware, the backend rejects calls with `HARDWARE_MISMATCH` (HTTP 403/422), instantly locking the UI into [`UnauthorizedScreen`](file:///home/sys-0743/My_projects_Murali/newfolder/Kiosk-tauri/src/screens/UnauthorizedScreen.tsx).
2. **Kiosk Lockdown:** The desktop window is configured as non-resizable, fullscreen, decorations-off, and always-on-top. Standard OS keyboard navigation (`Alt+Tab`, `F1-F12`, `Esc`, `Space`) is intercepted and blocked at both the Rust window level and the frontend keyboard policy listener when balance is zero.
3. **Staff Privileged Access:**
   - **`Ctrl+Shift+K`**: Staff exit gate (password protected via `AdminPassword` in `config.json`) to return the window to standard desktop size.
   - **`Ctrl+Shift+D`**: Hardware diagnostic gate to test printer, scanner, and bill acceptor without crediting real money.
   - **`Ctrl+Shift+R`**: Re-registration gate to rebind the kiosk with a new 19-character setup token (strictly prohibited while credit is active on the screen).
   - **`Ctrl+Shift+H`**: Hardware simulator overlay (strictly disabled in production builds where `VITE_HW_SIMULATOR` is unset).
