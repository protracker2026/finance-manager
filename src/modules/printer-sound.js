/**
 * Utility to use a real MP3 recording for thermal printer sound effects.
 * Asset: src/assets/sounds/receipt-printer.mp3
 */
export const PrinterSound = {
    ctx: null,
    masterGain: null,
    audioBuffer: null,
    isPrinting: false,
    _currentSource: null,
    _loopSource: null,
    _playId: 0,

    async init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Use a high shelf filter to gently reduce harsh highs instead of brutally cutting them off
        this.highCutFilter = this.ctx.createBiquadFilter();
        this.highCutFilter.type = 'highshelf';
        this.highCutFilter.frequency.value = 3000; // Target the piercing frequencies
        this.highCutFilter.gain.value = -8; // Reduce highs by 8dB to remove harshness without sounding muffled
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;

        // Connect chain: source -> filter -> masterGain -> destination
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
        const currentPlayId = ++this._playId;
        await this.init();
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        
        // Prevent race condition: if stopPrint was called (or another playRequested) while initializing, abort this play
        if (this._playId !== currentPlayId || this.isPrinting || !this.audioBuffer) return;
        
        this.isPrinting = true;

        // Based on new file "receipt-printer-02.mp3"
        this._loopSource = this.ctx.createBufferSource();
        this._loopSource.buffer = this.audioBuffer;
        this._loopSource.loop = true;
        
        // Loop a good middle section of the new file
        this._loopSource.loopStart = 0.2;
        this._loopSource.loopEnd = 1.5;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.1);

        this._loopSource.connect(gain);
        gain.connect(this.highCutFilter); // Route through the lowpass filter
        this._loopSource.start(0, 0.2);

        this._printGain = gain;
    },

    stopPrint() {
        this._playId++; // Invalidate any pending play requests
        this.isPrinting = false;
        if (this._loopSource) {
            const now = this.ctx.currentTime;
            
            // The animation has a final 0.2s ease-out animation.
            // Wait 0.2s before fading out so the sound perfectly syncs with the paper stopping.
            this._printGain.gain.setValueAtTime(this._printGain.gain.value, now);
            this._printGain.gain.setValueAtTime(this._printGain.gain.value, now + 0.2); // Hold volume
            this._printGain.gain.linearRampToValueAtTime(0, now + 0.35); // Fade out over 150ms
            
            this._loopSource.stop(now + 0.4);
            this._loopSource = null;
        }
    },

    async playTear() {
        await this.init();
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        if (!this.audioBuffer) return;

        // Play the "cut/tear" portion of the MP3
        const tearSource = this.ctx.createBufferSource();
        tearSource.buffer = this.audioBuffer;

        // Try to trigger near the end for the cut sound
        const tearDuration = 1.0;
        let cutOffset = Math.max(0, this.audioBuffer.duration - tearDuration);

        tearSource.connect(this.highCutFilter); // Route through the lowpass filter
        tearSource.start(0, cutOffset);
    }
};
