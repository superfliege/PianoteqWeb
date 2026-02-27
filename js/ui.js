/**
 * Pianoteq Web UI Module
 * Handles all DOM rendering and user interaction
 */
class PianoteqUI {
    constructor() {
        this.elements = {};
        this.allPresets = [];
        this.filteredPresets = [];
        this.allParameters = [];
        this.currentPresetName = '';
        this.seekDragging = false;
    }

    /**
     * Cache all DOM element references
     */
    init() {
        // Header
        this.elements.versionInfo = document.getElementById('version-info');
        this.elements.connectionStatus = document.getElementById('connection-status');
        this.elements.cpuLoad = document.getElementById('cpu-load');
        this.elements.polyphony = document.getElementById('polyphony');
        this.elements.btnPanic = document.getElementById('btn-panic');

        // Sidebar
        this.elements.sidebar = document.getElementById('sidebar');
        this.elements.btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
        this.elements.presetSearch = document.getElementById('preset-search');
        this.elements.filterCollection = document.getElementById('filter-collection');
        this.elements.filterClass = document.getElementById('filter-class');
        this.elements.filterInstrument = document.getElementById('filter-instrument');
        this.elements.filterLicensed = document.getElementById('filter-licensed');
        this.elements.presetList = document.getElementById('preset-list');
        this.elements.btnPrevPreset = document.getElementById('btn-prev-preset');
        this.elements.btnNextPreset = document.getElementById('btn-next-preset');

        // Current Preset
        this.elements.currentPresetName = document.getElementById('current-preset-name');
        this.elements.currentPresetModified = document.getElementById('current-preset-modified');
        this.elements.currentInstrument = document.getElementById('current-instrument');
        this.elements.currentAuthor = document.getElementById('current-author');
        this.elements.currentComment = document.getElementById('current-comment');
        this.elements.btnAbSwitch = document.getElementById('btn-ab-switch');
        this.elements.btnAbCopy = document.getElementById('btn-ab-copy');
        this.elements.btnUndo = document.getElementById('btn-undo');
        this.elements.btnRedo = document.getElementById('btn-redo');
        this.elements.btnReset = document.getElementById('btn-reset');
        this.elements.btnRandomize = document.getElementById('btn-randomize');

        // Parameter grids
        this.elements.paramsMain = document.getElementById('params-main');
        this.elements.paramsSound = document.getElementById('params-sound');
        this.elements.paramsPedals = document.getElementById('params-pedals');
        this.elements.paramsEffects = document.getElementById('params-effects');
        this.elements.paramsReverb = document.getElementById('params-reverb');
        this.elements.paramsMics = document.getElementById('params-mics');
        this.elements.paramsMisc = document.getElementById('params-misc');

        // Tabs
        this.elements.tabs = document.querySelectorAll('.tab');
        this.elements.tabContents = document.querySelectorAll('.tab-content');

        // Keyboard
        this.elements.pianoKeyboard = document.getElementById('piano-keyboard');
        this.elements.keyboardOctave = document.getElementById('keyboard-octave');
        this.elements.keyboardVelocity = document.getElementById('keyboard-velocity');
        this.elements.velocityDisplay = document.getElementById('velocity-display');

        // Transport
        this.elements.btnRewind = document.getElementById('btn-rewind');
        this.elements.btnStop = document.getElementById('btn-stop');
        this.elements.btnPlay = document.getElementById('btn-play');
        this.elements.btnPause = document.getElementById('btn-pause');
        this.elements.btnRecord = document.getElementById('btn-record');
        this.elements.seqName = document.getElementById('seq-name');
        this.elements.seqPosition = document.getElementById('seq-position');
        this.elements.seekSlider = document.getElementById('seek-slider');

        // Metronome
        this.elements.metronomeEnabled = document.getElementById('metronome-enabled');
        this.elements.metronomeBpm = document.getElementById('metronome-bpm');
        this.elements.metronomeTimesig = document.getElementById('metronome-timesig');
        this.elements.metronomeVolume = document.getElementById('metronome-volume');
        this.elements.metronomeVolumeDisplay = document.getElementById('metronome-volume-display');
        this.elements.metronomeAccentuate = document.getElementById('metronome-accentuate');

        // Toast container
        this.elements.toastContainer = document.getElementById('toast-container');

        this._initTabSwitching();
        this._initSidebarToggle();
        this._initVelocitySlider();
        this._initSeekSlider();
    }

    // ========== Tabs ==========

    _initTabSwitching() {
        this.elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.elements.tabs.forEach(t => t.classList.remove('active'));
                this.elements.tabContents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const target = document.getElementById(tab.dataset.tab);
                if (target) target.classList.add('active');
            });
        });
    }

    // ========== Sidebar Toggle ==========

    _initSidebarToggle() {
        this.elements.btnToggleSidebar.addEventListener('click', () => {
            this.elements.sidebar.classList.toggle('collapsed');
            const icon = this.elements.btnToggleSidebar.querySelector('i');
            icon.classList.toggle('fa-chevron-left');
            icon.classList.toggle('fa-chevron-right');
        });
    }

    // ========== Velocity Slider ==========

    _initVelocitySlider() {
        this.elements.keyboardVelocity.addEventListener('input', () => {
            this.elements.velocityDisplay.textContent = this.elements.keyboardVelocity.value;
        });
    }

    // ========== Seek Slider ==========

    _initSeekSlider() {
        this.elements.seekSlider.addEventListener('mousedown', () => { this.seekDragging = true; });
        this.elements.seekSlider.addEventListener('touchstart', () => { this.seekDragging = true; });
        this.elements.seekSlider.addEventListener('mouseup', () => { this.seekDragging = false; });
        this.elements.seekSlider.addEventListener('touchend', () => { this.seekDragging = false; });
    }

    // ========== Connection / Info ==========

    setConnected(connected) {
        const el = this.elements.connectionStatus;
        el.classList.toggle('connected', connected);
        el.classList.toggle('disconnected', !connected);
        el.title = connected ? 'Verbunden' : 'Nicht verbunden';
    }

    updateVersion(info) {
        this.elements.versionInfo.textContent = `v${info.version || '---'}`;
    }

    updatePerfInfo(perf) {
        if (perf.cpu_load !== undefined) {
            this.elements.cpuLoad.textContent = `CPU: ${(perf.cpu_load * 100).toFixed(1)}%`;
        }
        if (perf.current_polyphony !== undefined) {
            this.elements.polyphony.textContent = `Poly: ${perf.current_polyphony}`;
        }
    }

    // ========== Preset Info ==========

    updateCurrentPreset(info) {
        // current_preset can be an object {name, author, instrument, ...} or a string
        const cp = info.current_preset;
        const name = (cp && typeof cp === 'object') ? cp.name : (cp || info.name || '---');
        this.currentPresetName = name;
        this.elements.currentPresetName.textContent = name;

        // Update details from the current_preset object if available
        if (cp && typeof cp === 'object') {
            this.elements.currentInstrument.textContent = cp.instrument || cp.instr || '---';
            this.elements.currentAuthor.textContent = cp.author || '---';
            this.elements.currentComment.textContent = cp.comment || '';
        }

        if (info.modified || info.preset_modified) {
            this.elements.currentPresetModified.style.display = '';
        } else {
            this.elements.currentPresetModified.style.display = 'none';
        }
    }

    updatePresetDetails(presets) {
        // Find the current preset in the list to get details
        if (!presets || !presets.length) return;
        const current = presets.find(p => p.name === this.currentPresetName);
        if (current) {
            this.elements.currentInstrument.textContent = current.instr || '---';
            this.elements.currentAuthor.textContent = current.author || '---';
            this.elements.currentComment.textContent = current.comment || '';
        }
    }

    highlightActivePreset() {
        const items = this.elements.presetList.querySelectorAll('.preset-item');
        items.forEach(item => {
            item.classList.toggle('active', item.dataset.name === this.currentPresetName);
        });
        // Scroll active into view
        const active = this.elements.presetList.querySelector('.preset-item.active');
        if (active) {
            active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    // ========== Preset List ==========

    renderPresetList(presets, onSelect) {
        this.allPresets = presets;
        this._populateFilters(presets);
        this._filterAndRender(onSelect);
    }

    _populateFilters(presets) {
        const collections = new Set();
        const classes = new Set();
        const instruments = new Set();

        presets.forEach(p => {
            if (p.collection) collections.add(p.collection);
            if (p.class) classes.add(p.class);
            if (p.instr) instruments.add(p.instr);
        });

        this._fillSelect(this.elements.filterCollection, collections, 'Alle Kollektionen');
        this._fillSelect(this.elements.filterClass, classes, 'Alle Klassen');
        this._fillSelect(this.elements.filterInstrument, instruments, 'Alle Instrumente');
    }

    _fillSelect(select, values, allLabel) {
        const currentVal = select.value;
        select.innerHTML = `<option value="">${allLabel}</option>`;
        const sorted = [...values].sort();
        sorted.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            select.appendChild(opt);
        });
        select.value = currentVal;
    }

    bindPresetFilters(onSelect) {
        const doFilter = () => this._filterAndRender(onSelect);
        this.elements.presetSearch.addEventListener('input', doFilter);
        this.elements.filterCollection.addEventListener('change', doFilter);
        this.elements.filterClass.addEventListener('change', doFilter);
        this.elements.filterInstrument.addEventListener('change', doFilter);
        this.elements.filterLicensed.addEventListener('change', doFilter);
    }

    _filterAndRender(onSelect) {
        const search = this.elements.presetSearch.value.toLowerCase().trim();
        const collection = this.elements.filterCollection.value;
        const cls = this.elements.filterClass.value;
        const instr = this.elements.filterInstrument.value;
        const licensedOnly = this.elements.filterLicensed.checked;

        this.filteredPresets = this.allPresets.filter(p => {
            if (search && !p.name.toLowerCase().includes(search)) return false;
            if (collection && p.collection !== collection) return false;
            if (cls && p.class !== cls) return false;
            if (instr && p.instr !== instr) return false;
            return true;
        });

        this._renderList(this.filteredPresets, onSelect);
    }

    _renderList(presets, onSelect) {
        const container = this.elements.presetList;
        container.innerHTML = '';

        if (presets.length === 0) {
            container.innerHTML = '<div class="no-results">Keine Presets gefunden</div>';
            return;
        }

        // Group by collection
        const groups = {};
        presets.forEach(p => {
            const key = p.collection || 'Sonstige';
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });

        Object.keys(groups).sort().forEach(groupName => {
            const groupEl = document.createElement('div');
            groupEl.className = 'preset-group';

            const header = document.createElement('div');
            header.className = 'preset-group-header';
            header.textContent = groupName;
            header.addEventListener('click', () => {
                groupEl.classList.toggle('collapsed');
            });
            groupEl.appendChild(header);

            const list = document.createElement('div');
            list.className = 'preset-group-items';

            groups[groupName].forEach(preset => {
                const item = document.createElement('div');
                item.className = 'preset-item';
                item.dataset.name = preset.name;
                item.dataset.bank = preset.bank || '';

                const nameSpan = document.createElement('span');
                nameSpan.className = 'preset-item-name';
                nameSpan.textContent = preset.name;

                const instrSpan = document.createElement('span');
                instrSpan.className = 'preset-item-instr';
                instrSpan.textContent = preset.instr || '';

                item.appendChild(nameSpan);
                item.appendChild(instrSpan);

                if (preset.name === this.currentPresetName) {
                    item.classList.add('active');
                }

                item.addEventListener('click', () => {
                    if (onSelect) onSelect(preset.name, preset.bank);
                });

                list.appendChild(item);
            });

            groupEl.appendChild(list);
            container.appendChild(groupEl);
        });
    }

    // ========== Parameters ==========

    /**
     * Categorize parameter by its ID into one of the 7 tabs
     */
    static categorizeParam(id) {
        // Main parameters
        const mainIds = [
            'condition', 'dynamics', 'volume', 'velocity_offset',
            'post_effect_gain', 'diapason', 'stereo_width', 'sound_speed',
            'output_mode', 'eq_switch', 'eq_1', 'eq_2', 'eq_3',
            'direct_sound_duration'
        ];
        if (mainIds.includes(id)) return 'main';
        if (id.startsWith('eq_')) return 'main';

        // Pedals
        if (id.includes('pedal') || id === 'sustain_pedal' || id === 'soft_pedal' ||
            id === 'sostenuto_pedal' || id === 'harmonic_pedal' || id === 'rattle_pedal') {
            return 'pedals';
        }

        // Reverb
        if (id.startsWith('reverb_') || id === 'reverb') return 'reverb';

        // Microphones
        if (id.startsWith('mic_') || id.startsWith('mic1_') || id.startsWith('mic2_') ||
            id.startsWith('mic3_') || id.startsWith('mic4_') || id.startsWith('mic5_') ||
            id.startsWith('mic6_') || id.startsWith('mic7_') || id.startsWith('mic8_')) {
            return 'mics';
        }

        // Effects
        if (id.startsWith('effect_') || id.startsWith('limiter_')) return 'effects';

        // Sound
        if (id.startsWith('hammer_') || id.startsWith('profil_') || id.startsWith('strike_') ||
            id.startsWith('impedance') || id.startsWith('string_') || id.startsWith('sympathetic') ||
            id.startsWith('duplex') || id.startsWith('soundboard') || id.startsWith('blooming') ||
            id.startsWith('spectrum_') || id.startsWith('unison_') || id.startsWith('damper_') ||
            id === 'wall_distance' || id === 'lid_position' || id === 'output_delay' ||
            id.startsWith('tone_') || id === 'damping_duration') {
            return 'sound';
        }

        return 'misc';
    }

    renderParameters(params, onParamChange) {
        this.allParameters = params;
        const grouped = { main: [], sound: [], pedals: [], effects: [], reverb: [], mics: [], misc: [] };

        params.forEach(p => {
            const cat = PianoteqUI.categorizeParam(p.id);
            grouped[cat].push(p);
        });

        const targets = {
            main: this.elements.paramsMain,
            sound: this.elements.paramsSound,
            pedals: this.elements.paramsPedals,
            effects: this.elements.paramsEffects,
            reverb: this.elements.paramsReverb,
            mics: this.elements.paramsMics,
            misc: this.elements.paramsMisc
        };

        Object.keys(targets).forEach(cat => {
            this._renderParamGrid(targets[cat], grouped[cat], onParamChange);
        });

        // Update tab badges with count
        this.elements.tabs.forEach(tab => {
            const tabId = tab.dataset.tab;
            const catKey = this._tabIdToCat(tabId);
            if (catKey && grouped[catKey]) {
                const count = grouped[catKey].length;
                let badge = tab.querySelector('.tab-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'tab-badge';
                    tab.appendChild(badge);
                }
                badge.textContent = count;
            }
        });
    }

    _tabIdToCat(tabId) {
        const map = {
            'main-params': 'main',
            'sound-params': 'sound',
            'pedal-params': 'pedals',
            'effect-params': 'effects',
            'reverb-params': 'reverb',
            'mic-params': 'mics',
            'misc-params': 'misc'
        };
        return map[tabId];
    }

    _renderParamGrid(container, params, onParamChange) {
        container.innerHTML = '';

        if (!params || params.length === 0) {
            container.innerHTML = '<div class="no-results">Keine Parameter in dieser Kategorie</div>';
            return;
        }

        params.forEach(param => {
            const item = document.createElement('div');
            item.className = 'param-item';
            item.dataset.paramId = param.id;

            const isLocked = param.name && param.name.includes('(locked)');
            if (isLocked) item.classList.add('locked');

            // Label
            const label = document.createElement('div');
            label.className = 'param-label';
            const cleanName = (param.name || param.id).replace('(locked)', '').trim();
            label.textContent = cleanName;
            label.title = `${param.id} — ${param.text || ''}`;

            // Slider
            const sliderContainer = document.createElement('div');
            sliderContainer.className = 'param-slider-container';

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'param-slider';
            slider.min = '0';
            slider.max = '1';
            slider.step = '0.001';
            slider.value = param.normalized_value !== undefined ? param.normalized_value : 0;
            slider.disabled = isLocked;

            // Value display
            const valueDisplay = document.createElement('span');
            valueDisplay.className = 'param-value';
            valueDisplay.textContent = param.text || (param.normalized_value !== undefined ? param.normalized_value.toFixed(3) : '---');

            let debounceTimer = null;
            slider.addEventListener('input', () => {
                const val = parseFloat(slider.value);
                valueDisplay.textContent = val.toFixed(3);
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    if (onParamChange) onParamChange(param.id, val);
                }, 80);
            });

            // Double-click to reset to default
            slider.addEventListener('dblclick', () => {
                if (isLocked) return;
                slider.value = param.normalized_value;
                valueDisplay.textContent = param.text || param.normalized_value.toFixed(3);
                if (onParamChange) onParamChange(param.id, param.normalized_value);
            });

            sliderContainer.appendChild(slider);
            sliderContainer.appendChild(valueDisplay);

            item.appendChild(label);
            item.appendChild(sliderContainer);
            container.appendChild(item);
        });
    }

    /**
     * Update parameter values without re-rendering the entire grid (for live updates)
     */
    updateParameterValues(params) {
        params.forEach(param => {
            const item = document.querySelector(`.param-item[data-param-id="${param.id}"]`);
            if (!item) return;
            const slider = item.querySelector('.param-slider');
            const valueDisplay = item.querySelector('.param-value');
            if (slider && !slider.matches(':active')) {
                slider.value = param.normalized_value;
            }
            if (valueDisplay && !slider.matches(':active')) {
                valueDisplay.textContent = param.text || param.normalized_value.toFixed(3);
            }
        });
    }

    // ========== Transport ==========

    updateSequencerInfo(seq) {
        if (!seq) return;
        this.elements.seqName.textContent = seq.file || '---';

        const pos = seq.position || 0;
        const dur = seq.duration || 0;
        this.elements.seqPosition.textContent = `${this._formatTime(pos)} / ${this._formatTime(dur)}`;

        if (!this.seekDragging) {
            this.elements.seekSlider.max = dur || 100;
            this.elements.seekSlider.value = pos;
        }

        // Update transport button states
        const isPlaying = seq.status === 'playing';
        const isRecording = seq.status === 'recording';
        const isPaused = seq.status === 'paused';

        this.elements.btnPlay.classList.toggle('active', isPlaying);
        this.elements.btnPause.classList.toggle('active', isPaused);
        this.elements.btnRecord.classList.toggle('active', isRecording);
        this.elements.btnRecord.classList.toggle('recording', isRecording);
    }

    _formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // ========== Metronome ==========

    updateMetronome(metro) {
        if (!metro) return;
        this.elements.metronomeEnabled.checked = metro.enabled || false;
        this.elements.metronomeBpm.value = metro.bpm || 120;
        this.elements.metronomeVolume.value = metro.volume_db !== undefined ? metro.volume_db : 0;
        this.elements.metronomeVolumeDisplay.textContent = `${metro.volume_db || 0} dB`;
        if (metro.timesig) this.elements.metronomeTimesig.value = metro.timesig;
        this.elements.metronomeAccentuate.checked = metro.accentuate !== false;
    }

    getMetronomeValues() {
        return {
            enabled: this.elements.metronomeEnabled.checked,
            bpm: parseInt(this.elements.metronomeBpm.value) || 120,
            timesig: this.elements.metronomeTimesig.value,
            volume_db: parseInt(this.elements.metronomeVolume.value) || 0,
            accentuate: this.elements.metronomeAccentuate.checked
        };
    }

    // ========== Toast Notifications ==========

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle'
        };

        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> <span>${message}</span>`;
        this.elements.toastContainer.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, duration);
    }
}
