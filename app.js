/* ============================================================
   Pianoteq Remote – Application Logic
   ============================================================ */

// ── DOM references ──────────────────────────────────────────
const $presetList     = document.getElementById('preset-list');
const $presetSearch   = document.getElementById('preset-search');
const $currentPreset  = document.getElementById('current-preset');
const $connectionBanner = document.getElementById('connection-banner');
const $loadingOverlay = document.getElementById('loading-overlay');
const $settingsOverlay = document.getElementById('settings-overlay');
const $settingIp      = document.getElementById('setting-ip');
const $settingPort    = document.getElementById('setting-port');
const $btnAB          = document.getElementById('btn-ab');

// ── State ───────────────────────────────────────────────────
let presets       = [];         // full list of preset names
let currentPreset = '';         // currently loaded preset
let abState       = 'A';       // A or B
let paramTimers   = {};         // debounce timers per parameter

// ── Settings (localStorage) ─────────────────────────────────

/** Read connection settings from localStorage with defaults. */
function getSettings() {
  return {
    ip:   localStorage.getItem('ptq_ip')   || '192.168.1.100',
    port: localStorage.getItem('ptq_port') || '8081'
  };
}

/** Persist connection settings to localStorage. */
function saveSettings(ip, port) {
  localStorage.setItem('ptq_ip', ip);
  localStorage.setItem('ptq_port', port);
}

// ── JSON-RPC Helper ─────────────────────────────────────────

/**
 * Send a JSON-RPC 2.0 request to Pianoteq.
 * Shows a loading spinner for longer calls and surfaces errors.
 */
async function rpc(method, params = {}, { silent = false, showLoader = false } = {}) {
  const { ip, port } = getSettings();
  if (showLoader) showLoading(true);

  try {
    const res = await fetch(`http://${ip}:${port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, params, id: Date.now() })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    hideConnectionError();
    return data.result;
  } catch (err) {
    if (!silent) showConnectionError(err.message);
    throw err;
  } finally {
    if (showLoader) showLoading(false);
  }
}

// ── UI Helpers ──────────────────────────────────────────────

/** Show or hide the full-screen loading spinner. */
function showLoading(on) {
  $loadingOverlay.classList.toggle('hidden', !on);
}

/** Display a red error banner at the top. */
function showConnectionError(msg) {
  $connectionBanner.textContent = `Connection error: ${msg}`;
  $connectionBanner.className = 'banner error';
}

/** Hide the error banner. */
function hideConnectionError() {
  $connectionBanner.className = 'banner hidden';
}

/** Flash a brief green success banner. */
function showSuccess(msg) {
  $connectionBanner.textContent = msg;
  $connectionBanner.className = 'banner success';
  setTimeout(() => { $connectionBanner.className = 'banner hidden'; }, 2000);
}

// ── Tab Navigation ──────────────────────────────────────────

/** Wire up tab buttons to switch visible panels. */
function initTabs() {
  const tabs   = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
    });
  });
}

// ── Preset Browser ──────────────────────────────────────────

/** Fetch all presets from Pianoteq and render the list. */
async function loadPresets() {
  try {
    const result = await rpc('getListOfPresets', {}, { showLoader: true });
    // result may be an array of strings or objects with a "name" field
    presets = (result || []).map(p => (typeof p === 'string' ? p : p.name));
    renderPresets(presets);
  } catch {
    $presetList.innerHTML = '<li class="preset-item" style="color:var(--text-muted)">Unable to load presets</li>';
  }
}

/** Render a filtered list of presets into the DOM. */
function renderPresets(list) {
  $presetList.innerHTML = '';
  if (!list.length) {
    $presetList.innerHTML = '<li class="preset-item" style="color:var(--text-muted)">No presets found</li>';
    return;
  }

  list.forEach(name => {
    const li = document.createElement('li');
    li.className = 'preset-item' + (name === currentPreset ? ' selected' : '');
    li.textContent = name;
    li.addEventListener('click', () => selectPreset(name));
    $presetList.appendChild(li);
  });
}

/** Load a specific preset on the device. */
async function selectPreset(name) {
  try {
    await rpc('loadPreset', { name }, { showLoader: true });
    currentPreset = name;
    $currentPreset.textContent = name;
    renderPresets(filterPresets($presetSearch.value));
  } catch { /* error banner already shown */ }
}

/** Return presets matching the search query. */
function filterPresets(query) {
  const q = query.toLowerCase().trim();
  if (!q) return presets;
  return presets.filter(p => p.toLowerCase().includes(q));
}

/** Attach search-as-you-type handler. */
function initPresetSearch() {
  $presetSearch.addEventListener('input', () => {
    renderPresets(filterPresets($presetSearch.value));
  });
}

// ── Sound Parameters ────────────────────────────────────────

/**
 * Map of slider IDs to their Pianoteq parameter identifiers.
 * Adjust these IDs to match the actual Pianoteq JSON-RPC parameter names.
 */
const PARAM_MAP = {
  'param-volume':   'Volume',
  'param-dynamics': 'Dynamics',
  'param-velocity': 'Velocity Sensitivity',
  'param-reverb':   'Room Effect',
  'param-sustain':  'Blooming Energy'
};

/** Wire up all parameter sliders with debounced API calls. */
function initSliders() {
  Object.keys(PARAM_MAP).forEach(sliderId => {
    const slider  = document.getElementById(sliderId);
    const display = document.getElementById('val-' + sliderId.replace('param-', ''));

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      display.textContent = val.toFixed(2);
      debouncedSetParam(sliderId, PARAM_MAP[sliderId], val);
    });
  });
}

/** Debounce parameter changes to avoid flooding the API (150ms). */
function debouncedSetParam(key, paramId, value) {
  clearTimeout(paramTimers[key]);
  paramTimers[key] = setTimeout(() => {
    setParam(paramId, value);
  }, 150);
}

/** Send a parameter change to Pianoteq. */
async function setParam(paramId, value) {
  try {
    await rpc('setParameters', { list: [{ id: paramId, value }] }, { silent: true });
  } catch { /* silently fail – connection banner will show if persistent */ }
}

// ── A/B Switch ──────────────────────────────────────────────

/** Toggle between preset A and B on the device. */
async function toggleAB() {
  try {
    await rpc('abSwitch', {});
    abState = abState === 'A' ? 'B' : 'A';
    $btnAB.textContent = abState;
    $btnAB.classList.toggle('b-active', abState === 'B');
    // refresh displayed preset after switch
    await refreshInfo();
  } catch { /* error banner shown by rpc */ }
}

// ── MIDI Playback Controls ──────────────────────────────────

/** Start MIDI playback. */
async function midiPlay() {
  try { await rpc('midiPlay', {}, { silent: true }); } catch {}
}

/** Pause MIDI playback. */
async function midiPause() {
  try { await rpc('midiPause', {}, { silent: true }); } catch {}
}

/** Stop MIDI playback. */
async function midiStop() {
  try { await rpc('midiStop', {}, { silent: true }); } catch {}
}

// ── Status / Info ───────────────────────────────────────────

/** Fetch current info from Pianoteq and update the status bar. */
async function refreshInfo() {
  try {
    const info = await rpc('getInfo', {}, { silent: true });
    if (info && info.preset) {
      currentPreset = info.preset;
      $currentPreset.textContent = info.preset;
    }
  } catch { /* silently ignore – banner is automatic */ }
}

// ── Settings Panel ──────────────────────────────────────────

/** Open the settings overlay and populate fields. */
function openSettings() {
  const { ip, port } = getSettings();
  $settingIp.value   = ip;
  $settingPort.value = port;
  $settingsOverlay.classList.remove('hidden');
}

/** Close the settings overlay. */
function closeSettings() {
  $settingsOverlay.classList.add('hidden');
}

/** Save settings, close overlay, and attempt initial data fetch. */
function handleSaveSettings() {
  const ip   = $settingIp.value.trim() || '192.168.1.100';
  const port = $settingPort.value.trim() || '8081';
  saveSettings(ip, port);
  closeSettings();
  showSuccess('Settings saved');
  // Re-initialize connection
  init();
}

// ── Event Binding ───────────────────────────────────────────

/** Bind all static event listeners. */
function bindEvents() {
  // Settings
  document.getElementById('btn-settings').addEventListener('click', openSettings);
  document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
  document.getElementById('btn-save-settings').addEventListener('click', handleSaveSettings);

  // Close settings on backdrop click
  $settingsOverlay.addEventListener('click', (e) => {
    if (e.target === $settingsOverlay) closeSettings();
  });

  // Presets
  document.getElementById('btn-refresh-presets').addEventListener('click', loadPresets);

  // A/B Switch
  $btnAB.addEventListener('click', toggleAB);

  // Transport
  document.getElementById('btn-play').addEventListener('click', midiPlay);
  document.getElementById('btn-pause').addEventListener('click', midiPause);
  document.getElementById('btn-stop').addEventListener('click', midiStop);
}

// ── Initialization ──────────────────────────────────────────

/** Main initializer – fetch info and presets from Pianoteq. */
async function init() {
  await Promise.allSettled([
    refreshInfo(),
    loadPresets()
  ]);
}

// ── Boot ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSliders();
  initPresetSearch();
  bindEvents();

  // Show settings on first visit (no IP configured yet)
  if (!localStorage.getItem('ptq_ip')) {
    openSettings();
  } else {
    init();
  }
});
