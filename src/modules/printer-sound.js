/**
 * Utility to use a real MP3 recording for thermal printer sound effects.
 * Asset: src/assets/sounds/receipt-printer-02.mp3
 */
export const PrinterSound = {
    ctx: null,
    masterGain: null,
    audioBuffer: null,
    isPrinting: false,
    _loopSource: null,
    _printGain: null,
    _tearSource: null,
    _tearGain: null,

    async init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        this.highCutFilter = this.ctx.createBiquadFilter();
        this.highCutFilter.type = 'highshelf';
        this.highCutFilter.frequency.value = 3000;
        this.highCutFilter.gain.value = -8;
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;

        this.highCutFilter.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        try {
            const response = await fetch('/src/assets/sounds/receipt-printer-02.mp3');
            const arrayBuffer = await response.arrayBuffer();
            this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error('Failed to load printer sound asset:', error);
        }
    },

    async playPrint() {
        await this.init();
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        if (!this.audioBuffer) return;
        
        // *** FIX: Force-kill any existing loop BEFORE creating a new one ***
        this._killLoop();

        this.isPrinting = true;

        this._loopSource = this.ctx.createBufferSource();
        this._loopSource.buffer = this.audioBuffer;
        this._loopSource.loop = true;
        this._loopSource.loopStart = 0.2;
        this._loopSource.loopEnd = 1.5;

        this._printGain = this.ctx.createGain();
        this._printGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this._printGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.1);

        this._loopSource.connect(this._printGain);
        this._printGain.connect(this.highCutFilter);
        this._loopSource.start(0, 0.2);
    },

    /** Internal: immediately kill the loop source with no fade */
    _killLoop() {
        if (this._loopSource) {
            try {
                this._loopSource.stop();
                this._loopSource.disconnect();
            } catch (e) { /* already stopped */ }
            this._loopSource = null;
        }
        if (this._printGain) {
            try { this._printGain.disconnect(); } catch (e) {}
            this._printGain = null;
        }
    },

    /** Internal: immediately kill the tear source */
    _killTear() {
        if (this._tearSource) {
            try {
                this._tearSource.stop();
                this._tearSource.disconnect();
            } catch (e) { /* already stopped */ }
            this._tearSource = null;
        }
        if (this._tearGain) {
            try { this._tearGain.disconnect(); } catch (e) {}
            this._tearGain = null;
        }
    },

    stopPrint() {
        this.isPrinting = false;
        this._killLoop();
    },

    async playTear() {
        await this.init();
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        if (!this.audioBuffer) return;

        // Kill any existing tear sound first
        this._killTear();
        // Also ensure print loop is dead
        this._killLoop();

        const tearSource = this.ctx.createBufferSource();
        tearSource.buffer = this.audioBuffer;

        // Use only 0.5s of the end of the file to avoid repeated sounds
        const tearDuration = 0.5;
        const cutOffset = Math.max(0, this.audioBuffer.duration - tearDuration);

        // Create a gain node with fade-out to prevent abrupt end / lingering
        const now = this.ctx.currentTime;
        const tearGain = this.ctx.createGain();
        tearGain.gain.setValueAtTime(0.8, now);
        tearGain.gain.setValueAtTime(0.8, now + tearDuration * 0.6); // Hold for 60%
        tearGain.gain.linearRampToValueAtTime(0, now + tearDuration); // Fade out last 40%

        tearSource.connect(tearGain);
        tearGain.connect(this.highCutFilter);
        tearSource.start(0, cutOffset, tearDuration); // 3rd arg = max duration

        // Store references so stopAll can kill it
        this._tearSource = tearSource;
        this._tearGain = tearGain;

        // Auto-cleanup when the sound finishes naturally
        tearSource.onended = () => {
            if (this._tearSource === tearSource) {
                this._tearSource = null;
                this._tearGain = null;
            }
            try { tearGain.disconnect(); } catch (e) {}
        };
    },

    /** Stop everything — print loop AND tear sound. Call this on overlay close. */
    stopAll() {
        this.isPrinting = false;
        this._killLoop();
        this._killTear();
    }
};
