import { create } from 'zustand';
import type { KioskConfig } from '../types';

type Flash = { tone: 'ok' | 'warn' | 'error'; text: string } | null;

export type KioskAlertState = {
  tone: 'ok' | 'warn' | 'error';
  title: string;
  message: string;
  /** 0 = stay until dismissed */
  autoCloseMs?: number;
} | null;

type MachineState = {
  config: KioskConfig | null;
  /** Laravel machine_id used for API auth */
  machineId: string;
  balance: number;
  lastCashAmount: number | null;
  lastTicketCode: string | null;
  /** How credit was last added: cash note or ticket */
  creditSource: 'cash' | 'ticket' | null;
  statusMessage: Flash;
  alert: KioskAlertState;
  printerWarning: string | null;
  setConfig: (c: KioskConfig) => void;
  setMachineId: (id: string) => void;
  setBalance: (balance: number) => void;
  setLastCash: (amount: number | null) => void;
  setLastTicket: (code: string | null) => void;
  setCreditSource: (source: 'cash' | 'ticket' | null) => void;
  setStatus: (flash: Flash) => void;
  showAlert: (alert: NonNullable<KioskAlertState>) => void;
  clearAlert: () => void;
  setPrinterWarning: (msg: string | null) => void;
};

export const useMachine = create<MachineState>((set) => ({
  config: null,
  machineId: '',
  balance: 0,
  lastCashAmount: null,
  lastTicketCode: null,
  creditSource: null,
  statusMessage: null,
  alert: null,
  printerWarning: null,
  setConfig: (config) => set({ config }),
  setMachineId: (machineId) => set({ machineId }),
  setBalance: (balance) => set({ balance }),
  setLastCash: (lastCashAmount) => set({ lastCashAmount }),
  setLastTicket: (lastTicketCode) => set({ lastTicketCode }),
  setCreditSource: (creditSource) => set({ creditSource }),
  setStatus: (statusMessage) => set({ statusMessage }),
  showAlert: (alert) => set({ alert }),
  clearAlert: () => set({ alert: null }),
  setPrinterWarning: (printerWarning) => set({ printerWarning }),
}));
