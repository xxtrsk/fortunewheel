/**
 * Standalone High-Performance Confetti & Spooky Halloween Particles Engine
 * Offline, zero dependencies, canvas-based particle burst
 */
class ConfettiEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = null;
        this.halloweenMode = true;
        this.colors = [
            '#ff5722', '#ea580c', '#f97316', '#dc2626', 
            '#be123c', '#9333ea', '#a855f7', '#10b981', 
            '#fbbf24', '#ffffff', '#000000', '#7e22ce'
        ];
        this.halloweenIcons = ['🦇', '🎃', '🩸', '✨', '🕷️', '🕸️'];
        this.init();
    }

    init() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'confetti-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '990';
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        window.addEventListener('resize', () => this.resize());
    }

    setHalloweenMode(active) {
        this.halloweenMode = active;
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth * window.devicePixelRatio;
        this.canvas.height = window.innerHeight * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    burst(x = window.innerWidth / 2, y = window.innerHeight / 2, count = 140) {
        this.resize();

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 15 + 6;
            const isHalloweenItem = this.halloweenMode && Math.random() < 0.35;

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity - Math.random() * 5,
                size: isHalloweenItem ? Math.random() * 14 + 18 : Math.random() * 10 + 6,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 14,
                opacity: 1,
                decay: Math.random() * 0.007 + 0.005,
                shape: isHalloweenItem ? 'icon' : (Math.random() > 0.4 ? 'rect' : 'circle'),
                icon: isHalloweenItem ? this.halloweenIcons[Math.floor(Math.random() * this.halloweenIcons.length)] : null,
                wobble: Math.random() * 10
            });
        }

        if (!this.animationId) {
            this.loop();
        }
    }

    cannonSide(count = 75) {
        // Left cannon
        for (let i = 0; i < count; i++) {
            const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.5;
            const speed = Math.random() * 20 + 12;
            const isHalloweenItem = this.halloweenMode && Math.random() < 0.4;
            this.particles.push({
                x: 0,
                y: window.innerHeight * 0.8,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: isHalloweenItem ? Math.random() * 14 + 18 : Math.random() * 11 + 6,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 16,
                opacity: 1,
                decay: Math.random() * 0.006 + 0.004,
                shape: isHalloweenItem ? 'icon' : (Math.random() > 0.3 ? 'rect' : 'circle'),
                icon: isHalloweenItem ? this.halloweenIcons[Math.floor(Math.random() * this.halloweenIcons.length)] : null,
                wobble: Math.random() * 10
            });
        }
        // Right cannon
        for (let i = 0; i < count; i++) {
            const angle = -Math.PI * 3 / 4 + (Math.random() - 0.5) * 0.5;
            const speed = Math.random() * 20 + 12;
            const isHalloweenItem = this.halloweenMode && Math.random() < 0.4;
            this.particles.push({
                x: window.innerWidth,
                y: window.innerHeight * 0.8,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: isHalloweenItem ? Math.random() * 14 + 18 : Math.random() * 11 + 6,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 16,
                opacity: 1,
                decay: Math.random() * 0.006 + 0.004,
                shape: isHalloweenItem ? 'icon' : (Math.random() > 0.3 ? 'rect' : 'circle'),
                icon: isHalloweenItem ? this.halloweenIcons[Math.floor(Math.random() * this.halloweenIcons.length)] : null,
                wobble: Math.random() * 10
            });
        }

        if (!this.animationId) {
            this.loop();
        }
    }

    loop() {
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.26; // gravity
            p.vx *= 0.985; // air resistance
            p.rotation += p.rotationSpeed;
            p.opacity -= p.decay;
            p.wobble += 0.1;

            if (p.opacity <= 0 || p.y > window.innerHeight + 60) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate((p.rotation * Math.PI) / 180);
            this.ctx.globalAlpha = Math.max(0, p.opacity);

            if (p.shape === 'icon' && p.icon) {
                this.ctx.font = `${Math.round(p.size)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(p.icon, 0, 0);
            } else {
                this.ctx.fillStyle = p.color;
                const scaleX = Math.cos(p.wobble);
                if (p.shape === 'rect') {
                    this.ctx.fillRect(-p.size / 2 * scaleX, -p.size / 2, p.size * scaleX, p.size * 0.65);
                } else {
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }

            this.ctx.restore();
        }

        if (this.particles.length > 0) {
            this.animationId = requestAnimationFrame(() => this.loop());
        } else {
            this.animationId = null;
            this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
    }

    clear() {
        this.particles = [];
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.ctx) {
            this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
    }
}

window.Confetti = new ConfettiEngine();
