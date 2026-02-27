/**
 * Pianoteq Web Controller - Main Application
 * Initializes all modules and binds event handlers
 */
(function () {
    'use strict';

    const PIANOTEQ_URL = 'http://192.168.178.50:8081';
    const POLL_INTERVAL_FAST = 1500;  // For perf info, sequencer
    const POLL_INTERVAL_SLOW = 5000;  // For preset changes

    // Only show these licensed presets in the UI
    const LICENSED_PRESET_NAMES = [
        'Grand Steinway D (New York)',
        'Grand Steinway D (Hamburg)',
        'Grand Bösendorfer 280BC'
    ];

    // Normalize preset names for robust matching (remove diacritics, collapse spaces, lowercase)
    function normalizePresetName(name) {
        if (!name || typeof name !== 'string') return '';
        const noDiacritics = name.normalize('NFD').replace(/\p{Diacritic}/gu, '');
        const collapsed = noDiacritics.replace(/\s+/g, ' ').trim();
        return collapsed.toLowerCase();
    }

    let api, ui, keyboard;
    let pollFastTimer = null;
    let pollSlowTimer = null;
    let lastPresetName = '';
    let presetsLoaded = false;

    // ========== Initialization ==========

    async function init() {
        api = new PianoteqAPI(PIANOTEQ_URL);
        ui = new PianoteqUI();
        ui.init();

        keyboard = new PianoKeyboard(ui.elements.pianoKeyboard, api);

        bindEvents();

        // Initial data load
        ui.showToast('Verbinde mit Pianoteq...', 'info');
        await loadInitialData();

        // Start polling
        startPolling();
    }

    async function loadInitialData() {
        try {
            // Fetch info, presets, parameters, metronome in parallel
            const [info, presets, params, metronome, sequencer] = await Promise.all([
                api.getInfo(),
                api.getListOfPresets('full'),
                api.getParameters(),
                api.getMetronome(),
                api.getSequencerInfo()
            ]);

            ui.setConnected(true);

            // Update info
            ui.updateVersion(info);
            ui.updateCurrentPreset(info);
            lastPresetName = ui.currentPresetName;

            // Presets — filter to licensed list only (use normalized comparison)
            if (presets) {
                const licensedSet = new Set(LICENSED_PRESET_NAMES.map(n => normalizePresetName(n)));
                const licensedPresets = presets.filter(p => licensedSet.has(normalizePresetName(p.name)));
                ui.renderPresetList(licensedPresets, onPresetSelect);
                ui.bindPresetFilters(onPresetSelect);
                ui.updatePresetDetails(licensedPresets);
                ui.highlightActivePreset();
                presetsLoaded = true;
                if (licensedPresets.length === 0) {
                    ui.showToast('Keine lizenzierten Presets gefunden', 'warning', 4000);
                    console.warn('Licensed preset filter found 0 matches. Available presets count:', presets.length);
                } else {
                    console.info('Licensed preset filter matched', licensedPresets.length, 'presets');
                }
            }

            // Parameters
            if (params) {
                ui.renderParameters(params, onParameterChange);
            }

            // Metronome
            if (metronome) {
                ui.updateMetronome(metronome);
            }

            // Sequencer
            if (sequencer) {
                ui.updateSequencerInfo(sequencer);
            }

            // Perf info
            try {
                const perf = await api.getPerfInfo();
                ui.updatePerfInfo(perf);
            } catch (e) { /* perf info optional */ }

            ui.showToast('Verbunden mit Pianoteq!', 'success');

        } catch (err) {
            ui.setConnected(false);
            ui.showToast(`Verbindung fehlgeschlagen: ${err.message}`, 'error', 5000);
            console.error('Init error:', err);
        }
    }

    // ========== Event Bindings ==========

    function bindEvents() {
        // Panic button
        ui.elements.btnPanic.addEventListener('click', async () => {
            try {
                await api.panic();
                keyboard._allNotesOff();
                ui.showToast('Panic! Alle Noten gestoppt.', 'warning');
            } catch (e) {
                ui.showToast('Panic fehlgeschlagen', 'error');
            }
        });

        // Preset navigation
        ui.elements.btnPrevPreset.addEventListener('click', async () => {
            try {
                await api.prevPreset();
                await refreshPresetState();
            } catch (e) {
                ui.showToast('Fehler beim Wechseln', 'error');
            }
        });

        ui.elements.btnNextPreset.addEventListener('click', async () => {
            try {
                await api.nextPreset();
                await refreshPresetState();
            } catch (e) {
                ui.showToast('Fehler beim Wechseln', 'error');
            }
        });

        // A/B Switch
        ui.elements.btnAbSwitch.addEventListener('click', async () => {
            try {
                await api.abSwitch();
                await refreshParameters();
                ui.showToast('A/B umgeschaltet', 'info');
            } catch (e) {
                ui.showToast('A/B Fehler', 'error');
            }
        });

        ui.elements.btnAbCopy.addEventListener('click', async () => {
            try {
                await api.abCopy();
                ui.showToast('A/B kopiert', 'info');
            } catch (e) {
                ui.showToast('Fehler', 'error');
            }
        });

        // Undo/Redo
        ui.elements.btnUndo.addEventListener('click', async () => {
            try {
                await api.undo();
                await refreshParameters();
            } catch (e) {
                ui.showToast('Undo fehlgeschlagen', 'error');
            }
        });

        ui.elements.btnRedo.addEventListener('click', async () => {
            try {
                await api.redo();
                await refreshParameters();
            } catch (e) {
                ui.showToast('Redo fehlgeschlagen', 'error');
            }
        });

        // Reset
        ui.elements.btnReset.addEventListener('click', async () => {
            try {
                await api.resetPreset();
                await refreshParameters();
                ui.showToast('Preset zurückgesetzt', 'warning');
            } catch (e) {
                ui.showToast('Reset fehlgeschlagen', 'error');
            }
        });

        // Randomize
        ui.elements.btnRandomize.addEventListener('click', async () => {
            try {
                await api.randomizeParameters(0.5);
                await refreshParameters();
                ui.showToast('Parameter randomisiert', 'info');
            } catch (e) {
                ui.showToast('Randomize fehlgeschlagen', 'error');
            }
        });

        // Keyboard octave & velocity
        ui.elements.keyboardOctave.addEventListener('change', () => {
            keyboard.setOctave(parseInt(ui.elements.keyboardOctave.value));
        });

        ui.elements.keyboardVelocity.addEventListener('input', () => {
            keyboard.setVelocity(parseInt(ui.elements.keyboardVelocity.value));
        });

        // Transport buttons
        ui.elements.btnRewind.addEventListener('click', async () => {
            try { await api.midiRewind(); } catch (e) { ui.showToast('Rewind fehlgeschlagen', 'error'); }
        });

        ui.elements.btnStop.addEventListener('click', async () => {
            try { await api.midiStop(); } catch (e) { ui.showToast('Stop fehlgeschlagen', 'error'); }
        });

        ui.elements.btnPlay.addEventListener('click', async () => {
            try { await api.midiPlay(); } catch (e) { ui.showToast('Play fehlgeschlagen', 'error'); }
        });

        ui.elements.btnPause.addEventListener('click', async () => {
            try { await api.midiPause(); } catch (e) { ui.showToast('Pause fehlgeschlagen', 'error'); }
        });

        ui.elements.btnRecord.addEventListener('click', async () => {
            try { await api.midiRecord(); } catch (e) { ui.showToast('Record fehlgeschlagen', 'error'); }
        });

        // Seek slider
        ui.elements.seekSlider.addEventListener('change', async () => {
            try {
                const seconds = parseFloat(ui.elements.seekSlider.value);
                await api.midiSeek(seconds);
            } catch (e) {
                ui.showToast('Seek fehlgeschlagen', 'error');
            }
        });

        // Metronome controls
        const metronomeControls = [
            ui.elements.metronomeEnabled,
            ui.elements.metronomeBpm,
            ui.elements.metronomeTimesig,
            ui.elements.metronomeVolume,
            ui.elements.metronomeAccentuate
        ];

        metronomeControls.forEach(el => {
            const eventType = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'change';
            el.addEventListener(eventType, async () => {
                try {
                    const values = ui.getMetronomeValues();
                    await api.setMetronome(values);
                    ui.elements.metronomeVolumeDisplay.textContent = `${values.volume_db} dB`;
                } catch (e) {
                    ui.showToast('Metronom-Update fehlgeschlagen', 'error');
                }
            });
        });

        // Also update volume display on input for real-time feedback
        ui.elements.metronomeVolume.addEventListener('input', () => {
            ui.elements.metronomeVolumeDisplay.textContent = `${ui.elements.metronomeVolume.value} dB`;
        });
    }

    // ========== Callbacks ==========

    async function onPresetSelect(name, bank) {
        try {
            ui.showToast(`Lade: ${name}...`, 'info', 1500);
            // loadPreset places the preset into the inactive A/B slot
            await api.loadPreset(name, bank);
            // activate the slot that was just loaded
            await api.abSwitch();

            // verify active preset and then refresh UI/state
            const info = await api.getInfo();
            const cp = info.current_preset;
            const currentName = (cp && typeof cp === 'object') ? cp.name : (cp || '');
            if (currentName !== name) {
                ui.showToast(`Warnung: Geladenes Preset ist nicht aktiv: ${currentName}`, 'warning');
            }

            await refreshPresetState();
            ui.showToast(`Preset geladen: ${name}`, 'success');
        } catch (e) {
            ui.showToast(`Fehler beim Laden: ${e.message}`, 'error');
        }
    }

    async function onParameterChange(paramId, normalizedValue) {
        try {
            await api.setParameter(paramId, normalizedValue);
        } catch (e) {
            console.error('Parameter set error:', e);
        }
    }

    // ========== Refresh Functions ==========

    async function refreshPresetState() {
        try {
            const [info, params] = await Promise.all([
                api.getInfo(),
                api.getParameters()
            ]);

            ui.updateCurrentPreset(info);
            lastPresetName = ui.currentPresetName;
            ui.highlightActivePreset();

            if (presetsLoaded) {
                ui.updatePresetDetails(ui.allPresets);
            }

            if (params) {
                ui.renderParameters(params, onParameterChange);
            }
        } catch (e) {
            console.error('Refresh error:', e);
        }
    }

    async function refreshParameters() {
        try {
            const params = await api.getParameters();
            if (params) {
                ui.updateParameterValues(params);
            }
        } catch (e) {
            console.error('Param refresh error:', e);
        }
    }

    // ========== Polling ==========

    function startPolling() {
        // Fast poll: CPU, polyphony, sequencer
        pollFastTimer = setInterval(async () => {
            try {
                const [perf, seq] = await Promise.all([
                    api.getPerfInfo(),
                    api.getSequencerInfo()
                ]);
                ui.setConnected(true);
                ui.updatePerfInfo(perf);
                ui.updateSequencerInfo(seq);
            } catch (e) {
                ui.setConnected(false);
            }
        }, POLL_INTERVAL_FAST);

        // Slow poll: detect preset changes (from external sources like MIDI program change)
        pollSlowTimer = setInterval(async () => {
            try {
                const info = await api.getInfo();
                ui.setConnected(true);
                const cp = info.current_preset;
                const currentName = (cp && typeof cp === 'object') ? cp.name : (cp || '');
                if (currentName !== lastPresetName) {
                    lastPresetName = currentName;
                    ui.updateCurrentPreset(info);
                    ui.highlightActivePreset();
                    if (presetsLoaded) {
                        ui.updatePresetDetails(ui.allPresets);
                    }
                    // Refresh parameters since preset changed
                    const params = await api.getParameters();
                    if (params) {
                        ui.renderParameters(params, onParameterChange);
                    }
                    ui.showToast(`Preset gewechselt: ${currentName}`, 'info');
                }
            } catch (e) {
                ui.setConnected(false);
            }
        }, POLL_INTERVAL_SLOW);
    }

    // ========== Start ==========

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
