// Roguelite save/load + world/variant state.
// Pure data layer — no DOM, no simulation. Callers mutate state via methods
// on the singleton GameState, and everything auto-persists to localStorage.

import {
  SPECIES, STARTER_BASE_ID, STARTING_GENE_BUDGET, WIN_GENE_BONUS,
  UNIVERSAL_GENES, NICHE_GENES, GENE_COSTS,
} from './config.js';

const STORAGE_KEY = 'primordial_save';
const SAVE_VERSION = 1;

function uid() { return 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function emptySave() {
  return { version: SAVE_VERSION, activeWorldId: null, worlds: [] };
}

// Build an empty variant slot for each base species id.
function emptyVariants() {
  return SPECIES.map(() => null);
}

// Default gene values for a base species are pulled from SPECIES[baseId].
// We snapshot them at variant-creation time so further edits to SPECIES
// defaults (rare, but possible) don't silently shift existing variants.
function defaultGenesFor(baseId) {
  const sp = SPECIES[baseId];
  const genes = {};
  for (const k of UNIVERSAL_GENES) genes[k] = sp[k];
  for (const k of NICHE_GENES[baseId] || []) genes[k] = sp[k];
  return genes;
}

// Cost of a single gene's current value relative to its default.
// Symmetric: moving in the "free" direction refunds points.
function geneCost(key, value, defaultValue) {
  const cfg = GENE_COSTS[key];
  if (!cfg) return 0;
  const delta = (value - defaultValue) / cfg.step;
  // dir=+1 means higher-than-default costs, lower refunds.
  // dir=-1 means lower-than-default costs, higher refunds.
  return Math.round(delta * cfg.dir);
}

export function totalGeneCost(baseId, genes) {
  const defaults = defaultGenesFor(baseId);
  let total = 0;
  for (const k of Object.keys(genes)) {
    total += geneCost(k, genes[k], defaults[k]);
  }
  return total;
}

class _GameState {
  constructor() {
    this._load();
  }

  _load() {
    let raw;
    try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch { raw = null; }
    if (!raw || raw.version !== SAVE_VERSION) raw = emptySave();
    this.save = raw;
  }

  _persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.save)); }
    catch (e) { console.warn('primordial save failed:', e); }
  }

  // ── worlds ────────────────────────────────────────────────────────────────
  listWorlds() { return this.save.worlds; }

  getWorld(id) { return this.save.worlds.find(w => w.id === id) || null; }

  activeWorld() {
    return this.save.activeWorldId ? this.getWorld(this.save.activeWorldId) : null;
  }

  setActive(id) { this.save.activeWorldId = id; this._persist(); }

  createWorld(name) {
    const w = {
      id: uid(),
      name: name || `World ${this.save.worlds.length + 1}`,
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      unlockedBaseIds: [STARTER_BASE_ID],
      pendingUnlock: false,
      geneBudget: STARTING_GENE_BUDGET,
      variants: emptyVariants(),
      snapshot: null,
    };
    this.save.worlds.push(w);
    this.save.activeWorldId = w.id;
    this._persist();
    return w;
  }

  deleteWorld(id) {
    this.save.worlds = this.save.worlds.filter(w => w.id !== id);
    if (this.save.activeWorldId === id) this.save.activeWorldId = null;
    this._persist();
  }

  touchWorld(id) {
    const w = this.getWorld(id);
    if (w) { w.lastPlayed = Date.now(); this._persist(); }
  }

  // ── variants ──────────────────────────────────────────────────────────────
  getVariant(worldId, baseId) {
    const w = this.getWorld(worldId);
    return w ? w.variants[baseId] : null;
  }

  // Create or overwrite the variant in a base-species slot.
  upsertVariant(worldId, baseId, { name, genes }) {
    const w = this.getWorld(worldId);
    if (!w) return null;
    const existing = w.variants[baseId];
    const variant = existing
      ? { ...existing, name: name ?? existing.name, genes: { ...genes } }
      : { name: name || `sp-${baseId}`, baseId, genes: { ...genes }, hasWon: false, extinct: false };
    w.variants[baseId] = variant;
    this._persist();
    return variant;
  }

  defaultGenesFor(baseId) { return defaultGenesFor(baseId); }

  costFor(baseId, genes) { return totalGeneCost(baseId, genes); }

  // ── run outcomes ──────────────────────────────────────────────────────────
  // Called when a run wins (10 alive for 60s). First-time wins grant bonus
  // budget and set pendingUnlock so the UI can prompt for a niche pick.
  recordWin(worldId, baseId) {
    const w = this.getWorld(worldId);
    if (!w) return { firstTime: false, newBudget: 0 };
    const v = w.variants[baseId];
    if (!v) return { firstTime: false, newBudget: w.geneBudget };
    const firstTime = !v.hasWon;
    v.hasWon = true;
    v.extinct = false;
    if (firstTime) {
      w.geneBudget += WIN_GENE_BONUS;
      const lockedRemaining = SPECIES.some((_, i) => !w.unlockedBaseIds.includes(i));
      if (lockedRemaining) w.pendingUnlock = true;
    }
    this._persist();
    return { firstTime, newBudget: w.geneBudget };
  }

  markExtinct(worldId, baseId) {
    const w = this.getWorld(worldId);
    if (!w || !w.variants[baseId]) return;
    w.variants[baseId].extinct = true;
    this._persist();
  }

  // Player picked a niche to unlock from the pool after a win.
  chooseUnlock(worldId, baseId) {
    const w = this.getWorld(worldId);
    if (!w || w.unlockedBaseIds.includes(baseId)) return;
    w.unlockedBaseIds.push(baseId);
    w.pendingUnlock = false;
    this._persist();
  }

  // ── snapshot ──────────────────────────────────────────────────────────────
  saveSnapshot(worldId, snapshot) {
    const w = this.getWorld(worldId);
    if (!w) return;
    w.snapshot = snapshot;
    w.lastPlayed = Date.now();
    this._persist();
  }

  clearSnapshot(worldId) {
    const w = this.getWorld(worldId);
    if (w) { w.snapshot = null; this._persist(); }
  }
}

export const GameState = new _GameState();
