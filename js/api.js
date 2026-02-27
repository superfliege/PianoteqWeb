/**
 * Pianoteq JSON-RPC API Client
 * Communicates with Pianoteq via its JSON-RPC 2.0 interface
 */
class PianoteqAPI {
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.rpcUrl = `${this.baseUrl}/jsonrpc`;
        this.requestId = 0;
    }

    /**
     * Make a JSON-RPC 2.0 call
     */
    async rpc(method, params = {}) {
        this.requestId++;
        const payload = {
            jsonrpc: '2.0',
            method: method,
            params: params,
            id: this.requestId
        };

        try {
            const response = await fetch(this.rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(`RPC Error: ${data.error.message}`);
            }

            return data.result;
        } catch (err) {
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                throw new Error('Verbindung zu Pianoteq fehlgeschlagen');
            }
            throw err;
        }
    }

    // ========== Info Methods ==========

    async getInfo() {
        const result = await this.rpc('getInfo');
        return Array.isArray(result) ? result[0] : result;
    }

    async getPerfInfo() {
        const result = await this.rpc('getPerfInfo');
        return Array.isArray(result) ? result[0] : result;
    }

    async getActivationInfo() {
        const result = await this.rpc('getActivationInfo');
        return Array.isArray(result) ? result[0] : result;
    }

    // ========== Preset Methods ==========

    async getListOfPresets(presetType = 'full') {
        return await this.rpc('getListOfPresets', { preset_type: presetType });
    }

    async loadPreset(name, bank = '', presetType = 'full') {
        return await this.rpc('loadPreset', { name, bank, preset_type: presetType });
    }

    async savePreset(name, bank, presetType = 'full') {
        return await this.rpc('savePreset', { name, bank, preset_type: presetType });
    }

    async deletePreset(name, bank, presetType = 'full') {
        return await this.rpc('deletePreset', { name, bank, preset_type: presetType });
    }

    async resetPreset() {
        return await this.rpc('resetPreset');
    }

    async nextPreset() {
        return await this.rpc('nextPreset');
    }

    async prevPreset() {
        return await this.rpc('prevPreset');
    }

    async nextFavouritePreset() {
        return await this.rpc('nextFavouritePreset');
    }

    async prevFavouritePreset() {
        return await this.rpc('prevFavouritePreset');
    }

    async nextInstrument() {
        return await this.rpc('nextInstrument');
    }

    async prevInstrument() {
        return await this.rpc('prevInstrument');
    }

    // ========== A/B & Undo ==========

    async abSwitch() {
        return await this.rpc('abSwitch');
    }

    async abCopy() {
        return await this.rpc('abCopy');
    }

    async undo() {
        return await this.rpc('undo');
    }

    async redo() {
        return await this.rpc('redo');
    }

    // ========== Parameters ==========

    async getParameters() {
        return await this.rpc('getParameters');
    }

    async setParameters(paramList) {
        return await this.rpc('setParameters', { list: paramList });
    }

    async setParameter(id, normalizedValue) {
        return await this.setParameters([{ id, normalized_value: normalizedValue }]);
    }

    async setParameterByText(id, text) {
        return await this.setParameters([{ id, text: text }]);
    }

    async randomizeParameters(amount = 1.0) {
        return await this.rpc('randomizeParameters', { amount });
    }

    // ========== MIDI Transport ==========

    async getSequencerInfo() {
        const result = await this.rpc('getSequencerInfo');
        return Array.isArray(result) ? result[0] : result;
    }

    async midiPlay() {
        return await this.rpc('midiPlay');
    }

    async midiStop() {
        return await this.rpc('midiStop');
    }

    async midiPause() {
        return await this.rpc('midiPause');
    }

    async midiRewind() {
        return await this.rpc('midiRewind');
    }

    async midiRecord() {
        return await this.rpc('midiRecord');
    }

    async midiSeek(seconds) {
        return await this.rpc('midiSeek', { seconds });
    }

    async midiSend(bytes) {
        return await this.rpc('midiSend', { bytes });
    }

    // ========== MIDI Note helpers ==========

    async noteOn(note, velocity = 80, channel = 0) {
        const statusByte = 0x90 | (channel & 0x0F);
        return await this.midiSend([statusByte, note & 127, velocity & 127]);
    }

    async noteOff(note, channel = 0) {
        const statusByte = 0x80 | (channel & 0x0F);
        return await this.midiSend([statusByte, note & 127, 0]);
    }

    // ========== Metronome ==========

    async getMetronome() {
        const result = await this.rpc('getMetronome');
        return Array.isArray(result) ? result[0] : result;
    }

    async setMetronome(options) {
        return await this.rpc('setMetronome', options);
    }

    // ========== Audio ==========

    async getAudioDeviceInfo() {
        return await this.rpc('getAudioDeviceInfo');
    }

    async getListOfAudioDevices() {
        return await this.rpc('getListOfAudioDevices');
    }

    // ========== Misc ==========

    async panic() {
        return await this.rpc('panic');
    }

    async mute() {
        return await this.rpc('mute');
    }

    async loadFile(path) {
        return await this.rpc('loadFile', { path });
    }

    async loadMidiFile(path) {
        return await this.rpc('loadMidiFile', { path });
    }

    async saveMidiFile(path) {
        return await this.rpc('saveMidiFile', { path });
    }

    async listFunctions() {
        return await this.rpc('list');
    }

    /**
     * Check if Pianoteq is reachable
     */
    async ping() {
        try {
            await this.getInfo();
            return true;
        } catch {
            return false;
        }
    }
}
