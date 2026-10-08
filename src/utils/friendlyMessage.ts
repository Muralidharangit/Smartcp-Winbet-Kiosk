/** Strip Electron IPC / Error wrappers into a short player-facing line. */
export function friendlyMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  let raw = '';
  if (err instanceof Error) raw = err.message;
  else raw = String(err ?? '');

  raw = raw
    .replace(/^Error invoking remote method '[^']+':\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim();

  const lower = raw.toLowerCase();

  if (lower.includes('void') || lower.includes('voided')) {
    return 'This ticket is voided or invalid. Please contact the cashier.';
  }
  if (lower.includes('ticket not found') || lower.includes('already used') || lower.includes('already redeemed')) {
    return 'This ticket was not found or was already used. Please check the ticket or ask staff for help.';
  }
  if (lower.includes('no balance') || lower.includes('no balance to cash out')) {
    return 'There is no credit to cash out. Insert cash or scan a ticket first.';
  }
  if (lower.includes('printer not connected') || lower.includes('no writable printer') || lower.includes('printer offline')) {
    return 'Printer is not connected. Plug in the Epson printer, then try cash-out again.';
  }
  if (lower.includes('too low to restore') || lower.includes('shop balance too low') || lower.includes('shop balance low') || lower.includes('shop coins too low')) {
    return 'Shop balance too low. Please ask cashier or staff to refill coins.';
  }
  if (lower.includes('could not print') || lower.includes('print failed') || lower.includes('print error')) {
    return 'Cash-out cancelled due to printer issue. Please check paper roll.';
  }
  if (lower.includes('insufficient')) {
    return 'Not enough credit for that bet.';
  }
  if (lower.includes('platform not reachable') || lower.includes('fetch failed')) {
    return 'Online platform is not connected. Ask staff to check the network.';
  }
  if (lower.includes('not a credit ticket') || lower.includes('ignored')) {
    return 'That is not a credit ticket. Insert cash, or scan a cash-out ticket.';
  }

  if (!raw || raw === 'undefined' || raw === '[object Object]') return fallback;
  // Avoid dumping stack-like strings on the kiosk
  if (raw.length > 160) return fallback;
  return raw;
}

export function friendlyTitle(tone: 'ok' | 'warn' | 'error', hint?: string): string {
  if (hint) return hint;
  if (tone === 'ok') return 'Success';
  if (tone === 'warn') return 'Please note';
  return 'Unable to continue';
}
