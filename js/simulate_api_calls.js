#!/usr/bin/env node
// Simple Node script to simulate Pianoteq API calls sequence
// Usage: node js/simulate_api_calls.js

class MockPianoteqAPI {
    constructor() {
        this.activeSlot = 'A';
        this.slots = { A: null, B: null };
    }

    async loadPreset(name, bank = '') {
        console.log(`[rpc] loadPreset -> name: ${name}, bank: ${bank}`);
        // Simulate loading into inactive slot
        const inactive = this.activeSlot === 'A' ? 'B' : 'A';
        this.slots[inactive] = { name, bank };
        // simulate async delay
        await new Promise(r => setTimeout(r, 100));
        return { ok: true, slot: inactive };
    }

    async abSwitch() {
        console.log('[rpc] abSwitch -> switching active slot');
        this.activeSlot = this.activeSlot === 'A' ? 'B' : 'A';
        await new Promise(r => setTimeout(r, 50));
        return { ok: true, active: this.activeSlot };
    }

    async getInfo() {
        console.log('[rpc] getInfo -> returning info with current_preset');
        await new Promise(r => setTimeout(r, 30));
        return {
            current_preset: this.slots[this.activeSlot]
        };
    }
}

async function simulatePresetLoad(name, bank = '') {
    const api = new MockPianoteqAPI();

    console.log('\n--- Simulate loading when A is active ---');
    console.log('Initial active slot: A');

    await api.loadPreset(name, bank);
    await api.abSwitch();
    const info = await api.getInfo();
    console.log('After abSwitch, active preset:', info.current_preset);

    // Repeat when B is active to show symmetry
    console.log('\n--- Simulate loading again ---');
    await api.loadPreset('AnotherPreset', '');
    await api.abSwitch();
    const info2 = await api.getInfo();
    console.log('After second abSwitch, active preset:', info2.current_preset);
}

(async () => {
    const presetName = process.argv[2] || 'TestPreset';
    await simulatePresetLoad(presetName, '');
})();
