/**
 * Procedural Web Audio Sound Synthesizer
 * Featuring Gothic Seductive Halloween Soundscape & Classic Casino Fanfares
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.lastTickTime = 0;
        this.minTickInterval = 0.024; // seconds
        this.halloweenMode = true;
        this.loadSettings();
    }

    loadSettings() {
        const saved = localStorage.getItem('fortunewheel_sound_muted');
        if (saved !== null) {
            this.isMuted = saved === 'true';
        }
    }

    saveSettings() {
        localStorage.setItem('fortunewheel_sound_muted', this.isMuted.toString());
    }

    setHalloweenMode(active) {
        this.halloweenMode = active;
    }

    initContext() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.saveSettings();
        return this.isMuted;
    }

    setMuted(muted) {
        this.isMuted = muted;
        this.saveSettings();
    }

    /**
     * Play realistic mechanical or gothic bone ticker click
     * @param {number} speedFraction normalized speed 0.0 - 1.0
     */
    playTick(speedFraction = 0.5) {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        if (now - this.lastTickTime < this.minTickInterval) return;
        this.lastTickTime = now;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            if (this.halloweenMode) {
                // Seductive gothic bone-click / stiletto heel tick
                const baseFreq = 640 + speedFraction * 450 + (Math.random() - 0.5) * 60;
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.04);

                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(baseFreq * 1.4, now);
                filter.Q.setValueAtTime(5.0, now);

                const volume = Math.min(0.38, 0.16 + speedFraction * 0.22);
                gain.gain.setValueAtTime(volume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
            } else {
                // Classic crisp casino peg tick
                const baseFreq = 780 + speedFraction * 400 + (Math.random() - 0.5) * 80;
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);

                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(baseFreq * 1.2, now);
                filter.Q.setValueAtTime(4.0, now);

                const volume = Math.min(0.35, 0.15 + speedFraction * 0.2);
                gain.gain.setValueAtTime(volume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            }

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.05);

            // Subtle crisp burst
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.016);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.12 + speedFraction * 0.08, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

            noise.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
        } catch (e) {}
    }

    /**
     * Play spin launch whoosh sound with mystical gothic resonance
     */
    playSpinLaunch() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = this.halloweenMode ? 'sawtooth' : 'sine';
            osc.frequency.setValueAtTime(110, now);
            osc.frequency.exponentialRampToValueAtTime(this.halloweenMode ? 620 : 480, now + 0.35);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.22, now + 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.48);
        } catch (e) {}
    }

    /**
     * Play victorious gothic fanfare with seductive chords
     */
    playWin() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        if (this.halloweenMode) {
            // Seductive gothic minor arpeggio: D4 (293), F4 (349), A4 (440), C#5 (554), D5 (587), F5 (698), A5 (880)
            const gothicNotes = [293.66, 349.23, 440.00, 554.37, 587.33, 698.46, 880.00];

            gothicNotes.forEach((freq, idx) => {
                const noteStart = now + idx * 0.09;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                // Pipe organ / bell synthesis
                osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, noteStart);

                // Deep haunting vibrato on trailing notes
                if (idx >= 3) {
                    const lfo = this.ctx.createOscillator();
                    const lfoGain = this.ctx.createGain();
                    lfo.frequency.value = 5.5;
                    lfoGain.gain.value = 6;
                    lfo.connect(osc.frequency);
                    lfo.start(noteStart);
                    lfo.stop(noteStart + 1.8);
                }

                const duration = idx === gothicNotes.length - 1 ? 1.9 : 0.8;
                const maxVol = idx === gothicNotes.length - 1 ? 0.38 : 0.24;

                gain.gain.setValueAtTime(0.001, noteStart);
                gain.gain.linearRampToValueAtTime(maxVol, noteStart + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(noteStart);
                osc.stop(noteStart + duration + 0.05);
            });
        } else {
            // Classic triumphant major pentatonic
            const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
            notes.forEach((freq, idx) => {
                const noteStart = now + idx * 0.085;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
                osc.frequency.setValueAtTime(freq, noteStart);

                const duration = idx === notes.length - 1 ? 1.6 : 0.7;
                const maxVol = idx === notes.length - 1 ? 0.35 : 0.22;

                gain.gain.setValueAtTime(0.001, noteStart);
                gain.gain.linearRampToValueAtTime(maxVol, noteStart + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(noteStart);
                osc.stop(noteStart + duration + 0.05);
            });
        }
    }
}

window.Sound = new SoundEngine();
