// ASHEN VALE — three save slots per character progress.
const LEGACY_KEY = 'ashen_vale_save_v1';
const SLOT_PREFIX = 'ashen_vale_save_v2_slot';
export const SAVE_SLOTS = 3;

export function slotKey(index) {
  return `${SLOT_PREFIX}${index}`;
}

export function migrateLegacySave() {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy && !localStorage.getItem(slotKey(0))) {
      localStorage.setItem(slotKey(0), legacy);
    }
  } catch { /* ignore */ }
}

export function loadSlot(index) {
  try {
    const raw = localStorage.getItem(slotKey(index));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSlot(index, data) {
  localStorage.setItem(slotKey(index), JSON.stringify(data));
}

export function clearSlot(index) {
  localStorage.removeItem(slotKey(index));
}

export function slotSummary(save) {
  if (!save) return { empty: true };
  return {
    empty: false,
    level: save.level || 1,
    klass: save.klass,
    mapId: save.mapId || 'town',
    gold: save.gold || 0,
  };
}
