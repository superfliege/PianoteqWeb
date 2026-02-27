/**
 * Pianoteq Web - Virtual Piano Keyboard Module
 * Renders an interactive 2-octave piano keyboard that sends MIDI via the API
 */
class PianoKeyboard {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.activeNotes = new Set();
        this.velocity = 80;
        this.octave = 4; // C4 default
        this.isMouseDown = false;

        // Note names for display (one octave)
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        // Which notes are black keys
        this.blackKeyIndices = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#

        // Key mappings for computer keyboard (2 octaves starting from z row and q row)
        this.keyMap = {
            // Lower octave (z-row)
            'z': 0, 's': 1, 'x': 2, 'd': 3, 'c': 4, 'v': 5,
            'g': 6, 'b': 7, 'h': 8, 'n': 9, 'j': 10, 'm': 11,
            // Upper octave (q-row)
            'q': 12, '2': 13, 'w': 14, '3': 15, 'e': 16, 'r': 17,
            '5': 18, 't': 19, '6': 20, 'y': 21, '7': 22, 'u': 23,
            'i': 24
        };

        this.build();
        this._bindKeyboardEvents();
    }

    /**
     * Build the piano keyboard DOM (2 octaves + 1 note = 25 keys)
     */
    build() {
        this.container.innerHTML = '';
        const totalKeys = 25; // 2 octaves + top C

        for (let i = 0; i < totalKeys; i++) {
            const noteInOctave = i % 12;
            const octaveOffset = Math.floor(i / 12);
            const midiNote = (this.octave + octaveOffset) * 12 + noteInOctave + 12; // MIDI note (C4 = 60)
            const isBlack = this.blackKeyIndices.includes(noteInOctave);
            const noteName = this.noteNames[noteInOctave] + (this.octave + octaveOffset);

            const key = document.createElement('div');
            key.className = `piano-key ${isBlack ? 'black' : 'white'}`;
            key.dataset.note = midiNote;
            key.dataset.name = noteName;
            key.title = `${noteName} (MIDI ${midiNote})`;

            if (!isBlack) {
                const label = document.createElement('span');
                label.className = 'key-label';
                label.textContent = noteName;
                key.appendChild(label);
            }

            // Mouse events
            key.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.isMouseDown = true;
                this._noteOn(midiNote, key);
            });

            key.addEventListener('mouseenter', (e) => {
                if (this.isMouseDown) {
                    this._noteOn(midiNote, key);
                }
            });

            key.addEventListener('mouseleave', (e) => {
                if (this.activeNotes.has(midiNote)) {
                    this._noteOff(midiNote, key);
                }
            });

            key.addEventListener('mouseup', (e) => {
                this._noteOff(midiNote, key);
                this.isMouseDown = false;
            });

            // Touch events
            key.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this._noteOn(midiNote, key);
            });

            key.addEventListener('touchend', (e) => {
                e.preventDefault();
                this._noteOff(midiNote, key);
            });

            key.addEventListener('touchcancel', (e) => {
                this._noteOff(midiNote, key);
            });

            this.container.appendChild(key);
        }

        // Global mouse up
        document.addEventListener('mouseup', () => {
            if (this.isMouseDown) {
                this.isMouseDown = false;
                this._allNotesOff();
            }
        });
    }

    _noteOn(midiNote, keyEl) {
        if (this.activeNotes.has(midiNote)) return;
        this.activeNotes.add(midiNote);
        if (keyEl) keyEl.classList.add('pressed');
        this.api.noteOn(midiNote, this.velocity).catch(() => {});
    }

    _noteOff(midiNote, keyEl) {
        if (!this.activeNotes.has(midiNote)) return;
        this.activeNotes.delete(midiNote);
        if (keyEl) keyEl.classList.remove('pressed');
        this.api.noteOff(midiNote).catch(() => {});
    }

    _allNotesOff() {
        this.activeNotes.forEach(note => {
            const keyEl = this.container.querySelector(`[data-note="${note}"]`);
            if (keyEl) keyEl.classList.remove('pressed');
            this.api.noteOff(note).catch(() => {});
        });
        this.activeNotes.clear();
    }

    /**
     * Bind computer keyboard for playing notes
     */
    _bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

            const key = e.key.toLowerCase();
            if (key in this.keyMap) {
                e.preventDefault();
                const offset = this.keyMap[key];
                const midiNote = (this.octave * 12) + offset + 12;
                const keyEl = this.container.querySelector(`[data-note="${midiNote}"]`);
                this._noteOn(midiNote, keyEl);
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keyMap) {
                e.preventDefault();
                const offset = this.keyMap[key];
                const midiNote = (this.octave * 12) + offset + 12;
                const keyEl = this.container.querySelector(`[data-note="${midiNote}"]`);
                this._noteOff(midiNote, keyEl);
            }
        });
    }

    setOctave(octave) {
        this.octave = octave;
        this._allNotesOff();
        this.build();
    }

    setVelocity(velocity) {
        this.velocity = Math.max(1, Math.min(127, velocity));
    }
}
