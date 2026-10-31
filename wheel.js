/**
 * FortuneWheel Engine
 * High-DPI Canvas Rendering, 3D Skeuomorphic Depth, Physics & Precise Math
 */
class FortuneWheel {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Settings & Callbacks
        this.sectors = options.sectors || [];
        this.onSpinStart = options.onSpinStart || (() => {});
        this.onSpinEnd = options.onSpinEnd || (() => {});
        this.onTick = options.onTick || (() => {});
        this.onSectorHover = options.onSectorHover || (() => {});
        this.onSectorClick = options.onSectorClick || (() => {});

        // State
        this.currentAngle = 0; // In radians
        this.isSpinning = false;
        this.spinStartTime = 0;
        this.spinDuration = 5500; // ms
        this.startAngle = 0;
        this.targetAngle = 0;
        this.winningSector = null;
        
        // Visuals & Zoom
        this.scale = 1.0; // Zoom multiplier (0.6 - 1.5)
        this.halloweenMode = options.halloweenMode !== undefined ? options.halloweenMode : true;
        this.ledOffset = 0;
        this.pointerFlapperAngle = 0; // In radians
        this.pointerAngularVelocity = 0;
        this.lastPegIndex = -1;
        this.hoveredSectorIndex = -1;

        // Size & Dimensions
        this.width = 0;
        this.height = 0;
        this.cx = 0;
        this.cy = 0;
        this.radius = 0;
        this.hubRadius = 0;

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Mouse interactions for hover & hub click
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        // Start render loop
        this.render();
    }

    setSectors(sectors) {
        this.sectors = sectors;
        this.requestDraw();
    }

    setHalloweenMode(active) {
        this.halloweenMode = !!active;
        this.requestDraw();
    }

    setScale(scale) {
        this.scale = Math.max(0.6, Math.min(1.5, scale));
        this.resize();
    }

    getScale() {
        return this.scale;
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Determine available square dimensions
        const availableSize = Math.min(rect.width, rect.height) || 600;
        this.width = availableSize;
        this.height = availableSize;

        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx.resetTransform();
        this.ctx.scale(dpr, dpr);

        this.cx = this.width / 2;
        this.cy = this.height / 2;
        
        // Make wheel occupy maximum possible space with safe padding for outer rim & pointer
        const baseRadius = (this.width / 2) - 34;
        this.radius = Math.max(120, baseRadius * this.scale);
        this.hubRadius = Math.max(38, this.radius * 0.17);

        this.requestDraw();
    }

    requestDraw() {
        if (!this.isSpinning) {
            this.draw();
        }
    }

    /**
     * Start smooth deceleration spin
     * @param {number} targetSectorIndex Optional index to force or random if null
     */
    spin(targetSectorIndex = null) {
        if (this.isSpinning || this.sectors.length === 0) return;

        this.isSpinning = true;
        this.spinStartTime = performance.now();
        this.startAngle = this.currentAngle;

        // Determine winning sector
        let winnerIndex;
        if (targetSectorIndex !== null && targetSectorIndex >= 0 && targetSectorIndex < this.sectors.length) {
            winnerIndex = targetSectorIndex;
        } else {
            winnerIndex = Math.floor(Math.random() * this.sectors.length);
        }

        const numSectors = this.sectors.length;
        const sliceAngle = (Math.PI * 2) / numSectors;

        // Calculate angular position of target sector
        // Pointer is at 12 o'clock (270 degrees = 3*PI/2)
        const pointerAngle = (3 * Math.PI) / 2;
        
        // Random landing offset inside sector (10% to 90% of slice width to avoid exact border ambiguity)
        const innerOffset = (0.2 + Math.random() * 0.6) * sliceAngle;
        const targetSectorCenter = winnerIndex * sliceAngle + innerOffset;

        // Target angle calculation:
        // We want: (pointerAngle - finalAngle) % (2*PI) === targetSectorCenter
        // => finalAngle = pointerAngle - targetSectorCenter + 2*PI * fullRotations
        const currentMod = this.startAngle % (Math.PI * 2);
        let delta = pointerAngle - targetSectorCenter - currentMod;
        while (delta < 0) {
            delta += Math.PI * 2;
        }

        // Full rotations for suspense (between 6 and 9 rotations)
        const fullRotations = Math.floor(Math.random() * 3) + 7;
        this.targetAngle = this.startAngle + delta + fullRotations * Math.PI * 2;
        this.winningSector = this.sectors[winnerIndex];

        // Random duration with slight variance (5.0s - 6.5s)
        this.spinDuration = 5400 + Math.random() * 900;

        if (this.onSpinStart) {
            this.onSpinStart();
        }

        this.animate();
    }

    animate() {
        const now = performance.now();
        const elapsed = now - this.spinStartTime;
        const t = Math.min(1, elapsed / this.spinDuration);

        // Custom high-inertia physics easing curve (exponential ease-out / quintic)
        // Starts very fast, cruises, and decelerates with suspenseful ticks
        const ease = 1 - Math.pow(1 - t, 4.2);

        const prevAngle = this.currentAngle;
        this.currentAngle = this.startAngle + (this.targetAngle - this.startAngle) * ease;
        const currentSpeed = (this.currentAngle - prevAngle) * 60; // rad/sec approx

        // Check peg ticks under pointer
        this.updatePegCollisions(prevAngle, this.currentAngle, currentSpeed);

        // Update flapper physics (spring damping)
        const flapperTarget = 0;
        const springForce = (flapperTarget - this.pointerFlapperAngle) * 0.35;
        this.pointerAngularVelocity += springForce;
        this.pointerAngularVelocity *= 0.82; // damping
        this.pointerFlapperAngle += this.pointerAngularVelocity;

        // Rotate LEDs slowly
        this.ledOffset += 0.08;

        this.draw();

        if (t < 1) {
            requestAnimationFrame(() => this.animate());
        } else {
            // Spin finished
            this.currentAngle = this.targetAngle;
            this.isSpinning = false;
            this.pointerFlapperAngle = 0;
            this.pointerAngularVelocity = 0;
            this.draw();

            // Verify mathematical result at exact stop position
            const resultSector = this.getSectorAtPointer();
            if (this.onSpinEnd) {
                this.onSpinEnd(resultSector || this.winningSector);
            }
        }
    }

    updatePegCollisions(prevAngle, newAngle, speed) {
        if (this.sectors.length === 0) return;
        const numPegs = Math.max(this.sectors.length, 24);
        const pegAngleStep = (Math.PI * 2) / numPegs;
        const pointerAngle = (3 * Math.PI) / 2;

        // Map wheel angles relative to pointer
        const pointerRelAngleNew = ((pointerAngle - (newAngle % (Math.PI * 2))) + Math.PI * 2) % (Math.PI * 2);
        const pegIndex = Math.floor(pointerRelAngleNew / pegAngleStep);

        if (pegIndex !== this.lastPegIndex) {
            this.lastPegIndex = pegIndex;
            // Impulse on flapper
            this.pointerAngularVelocity = Math.min(0.55, 0.15 + speed * 0.02);
            const speedFraction = Math.min(1, speed / 15);
            if (this.onTick) {
                this.onTick(speedFraction);
            }
        }
    }

    getSectorAtPointer() {
        if (this.sectors.length === 0) return null;
        const numSectors = this.sectors.length;
        const sliceAngle = (Math.PI * 2) / numSectors;
        const pointerAngle = (3 * Math.PI) / 2;

        let relativeAngle = ((pointerAngle - (this.currentAngle % (Math.PI * 2))) + Math.PI * 2) % (Math.PI * 2);
        const index = Math.floor(relativeAngle / sliceAngle) % numSectors;
        return this.sectors[index];
    }

    getSectorAtAngle(angleRad) {
        if (this.sectors.length === 0) return -1;
        const numSectors = this.sectors.length;
        const sliceAngle = (Math.PI * 2) / numSectors;

        let relAngle = ((angleRad - (this.currentAngle % (Math.PI * 2))) + Math.PI * 2) % (Math.PI * 2);
        return Math.floor(relAngle / sliceAngle) % numSectors;
    }

    /**
     * Main Canvas Drawing Routine
     */
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        ctx.save();
        ctx.translate(this.cx, this.cy);

        // 1. Drop shadow beneath the entire wheel
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 8, this.radius + 18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 35;
        ctx.shadowOffsetY = 14;
        ctx.fill();
        ctx.restore();

        // 2. Outer Bezel / Rim (3D Dark Titanium & Gold Layering)
        this.drawOuterRim(ctx);

        // 3. Rotating Sectors Group
        ctx.save();
        ctx.rotate(this.currentAngle);
        this.drawSectors(ctx);
        ctx.restore();

        // 4. Glass overlay shine across the upper half of wheel
        this.drawGlassShine(ctx);

        // 5. Outer Pegs / Rivets (can twinkle)
        this.drawPegs(ctx);

        // 6. Central Hub (Interactive Spin Center)
        this.drawCenterHub(ctx);

        // 7. Top Pointer / Ticker with Physics Bounce
        this.drawPointer(ctx);

        ctx.restore();
    }

    drawOuterRim(ctx) {
        const rimOuter = this.radius + 24;
        const rimInner = this.radius - 2;

        if (this.halloweenMode) {
            // Seductive Gothic Vampire & Obsidian Pumpkin Rim
            const grad = ctx.createRadialGradient(0, 0, rimInner, 0, 0, rimOuter);
            grad.addColorStop(0, '#1c0510');
            grad.addColorStop(0.3, '#380918');
            grad.addColorStop(0.6, '#0f050a');
            grad.addColorStop(0.85, '#7f1d1d');
            grad.addColorStop(0.95, '#f97316');
            grad.addColorStop(1, '#050204');

            ctx.beginPath();
            ctx.arc(0, 0, rimOuter, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Glowing Blood-Orange & Ruby Inlay Ring
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 9, 0, Math.PI * 2);
            ctx.lineWidth = 4;
            const bloodGrad = ctx.createLinearGradient(-this.radius, -this.radius, this.radius, this.radius);
            bloodGrad.addColorStop(0, '#ffedd5');
            bloodGrad.addColorStop(0.25, '#ea580c');
            bloodGrad.addColorStop(0.5, '#f43f5e');
            bloodGrad.addColorStop(0.75, '#be123c');
            bloodGrad.addColorStop(1, '#ea580c');
            ctx.strokeStyle = bloodGrad;
            ctx.shadowColor = 'rgba(234, 88, 12, 0.6)';
            ctx.shadowBlur = 12;
            ctx.stroke();
            ctx.shadowBlur = 0; // reset

            // Inner hot rim highlight
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 1, 0, Math.PI * 2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.45)';
            ctx.stroke();
        } else {
            // Classic Metallic Dark Titanium & Gold Rim
            const grad = ctx.createRadialGradient(0, 0, rimInner, 0, 0, rimOuter);
            grad.addColorStop(0, '#1e293b');
            grad.addColorStop(0.3, '#334155');
            grad.addColorStop(0.7, '#0f172a');
            grad.addColorStop(0.9, '#e2e8f0');
            grad.addColorStop(1, '#020617');

            ctx.beginPath();
            ctx.arc(0, 0, rimOuter, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Gold inlay ring
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 9, 0, Math.PI * 2);
            ctx.lineWidth = 3.5;
            const goldGrad = ctx.createLinearGradient(-this.radius, -this.radius, this.radius, this.radius);
            goldGrad.addColorStop(0, '#fef08a');
            goldGrad.addColorStop(0.3, '#d97706');
            goldGrad.addColorStop(0.6, '#fef08a');
            goldGrad.addColorStop(0.85, '#92400e');
            goldGrad.addColorStop(1, '#fef08a');
            ctx.strokeStyle = goldGrad;
            ctx.stroke();

            // Inner bevel
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 1, 0, Math.PI * 2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.stroke();
        }
    }

    drawSectors(ctx) {
        const numSectors = this.sectors.length;
        if (numSectors === 0) {
            // Draw empty placeholder
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            return;
        }

        const sliceAngle = (Math.PI * 2) / numSectors;

        for (let i = 0; i < numSectors; i++) {
            const sector = this.sectors[i];
            const startAngle = i * sliceAngle;
            const endAngle = startAngle + sliceAngle;
            const midAngle = startAngle + sliceAngle / 2;

            // Wedge path
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, this.radius, startAngle, endAngle);
            ctx.closePath();

            // Rich Radial Gradient for sector depth
            const secGrad = ctx.createRadialGradient(0, 0, this.hubRadius * 0.8, 0, 0, this.radius);
            const baseColor = sector.color || '#3b82f6';
            secGrad.addColorStop(0, this.adjustBrightness(baseColor, 15));
            secGrad.addColorStop(0.85, baseColor);
            secGrad.addColorStop(1, this.adjustBrightness(baseColor, -25));

            ctx.fillStyle = secGrad;
            ctx.fill();

            // Sector separator line
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.stroke();

            // Sector Inner Border Shadow
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.stroke();

            // Render Sector Content (Title + Multi-line Description)
            this.drawSectorText(ctx, sector, midAngle, sliceAngle, i);
        }
    }

    /**
     * Advanced Text Formatting & Placement within Sectors
     * Accommodates both short titles and detailed multi-sentence descriptions
     * Stacks Title and Description neatly along the radial wedge
     */
    drawSectorText(ctx, sector, midAngle, sliceAngle, index) {
        ctx.save();
        ctx.rotate(midAngle);

        const textColor = this.getContrastingTextColor(sector.color || '#3b82f6');
        const numSectors = this.sectors.length;

        // Radius boundaries for text
        const innerBound = this.hubRadius + 14;
        const outerBound = this.radius - 22;
        const availableRadialSpan = outerBound - innerBound;

        // Radial start and max width for lines
        const startX = innerBound + Math.max(8, availableRadialSpan * 0.08);
        const endX = outerBound - 24; // Leave room for sector badge near rim
        const maxLineWidth = Math.max(60, endX - startX);

        // Calculate available lateral height near startX
        const halfAngle = sliceAngle / 2;
        const availableHeightAtStart = 2 * startX * Math.tan(halfAngle);
        const availableHeightAtMid = 2 * (startX + maxLineWidth * 0.5) * Math.tan(halfAngle);

        // Sector index badge / number near outer rim edge
        ctx.save();
        ctx.fillStyle = textColor === '#ffffff' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(15, 23, 42, 0.75)';
        const badgeSize = Math.max(9, Math.min(13, 11 * (this.radius / 260)));
        ctx.font = `700 ${badgeSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`#${index + 1}`, outerBound - 4, 0);
        ctx.restore();

        // Check if we can show description lines
        const hasDesc = sector.description && sector.description.trim().length > 0;
        const canFitMultiLine = hasDesc && (availableHeightAtStart >= 30 || availableHeightAtMid >= 44) && numSectors <= 14;

        // Dynamic typography sizing
        let titleSize = 15;
        let descSize = 10.5;

        if (numSectors <= 4) {
            titleSize = 20;
            descSize = 12.5;
        } else if (numSectors <= 8) {
            titleSize = 15.5;
            descSize = 11;
        } else if (numSectors <= 12) {
            titleSize = 13.5;
            descSize = 9.5;
        } else if (numSectors <= 16) {
            titleSize = 12;
            descSize = 8.5;
        } else {
            titleSize = 10.5;
            descSize = 8;
        }

        // Scale by wheel zoom factor
        const zoomFactor = this.radius / 260;
        titleSize = Math.max(9.5, titleSize * zoomFactor);
        descSize = Math.max(8, descSize * zoomFactor);

        // Setup text rendering styling
        ctx.save();
        ctx.fillStyle = textColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        if (textColor === '#ffffff') {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
        } else {
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            ctx.shadowBlur = 3;
        }

        const titleText = sector.title || `Sector ${index + 1}`;

        if (!canFitMultiLine) {
            // Single Line Title Centered vertically
            ctx.font = `bold ${Math.round(titleSize * 1.1)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            const displayTitle = this.truncateText(ctx, titleText, maxLineWidth);
            ctx.fillText(displayTitle, startX, 0);
        } else {
            // Multi-line: Title on top, Description preview underneath
            const titleY = -Math.round(descSize * 0.85);
            ctx.font = `bold ${Math.round(titleSize)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            const displayTitle = this.truncateText(ctx, titleText, maxLineWidth);
            ctx.fillText(displayTitle, startX, titleY);

            // Description lines
            ctx.save();
            ctx.fillStyle = textColor === '#ffffff' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.9)';
            ctx.font = `500 ${Math.round(descSize)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            
            // Format 1 or 2 description lines
            const words = sector.description.trim().split(/\s+/);
            const lines = [];
            let currentLine = '';
            const maxDescLines = numSectors <= 6 ? 2 : 1;

            for (let i = 0; i < words.length; i++) {
                const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
                if (ctx.measureText(testLine).width > maxLineWidth) {
                    if (currentLine) {
                        lines.push(currentLine);
                        currentLine = words[i];
                        if (lines.length >= maxDescLines) break;
                    } else {
                        lines.push(this.truncateText(ctx, testLine, maxLineWidth));
                        break;
                    }
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine && lines.length < maxDescLines) {
                lines.push(currentLine);
            }

            // Ellipsis if there is still remaining text
            if (lines.length > 0) {
                const wordsCovered = lines.join(' ').split(/\s+/).length;
                if (wordsCovered < words.length) {
                    lines[lines.length - 1] = this.truncateText(ctx, lines[lines.length - 1] + '…', maxLineWidth);
                }

                const descLineHeight = descSize * 1.25;
                for (let li = 0; li < lines.length; li++) {
                    const descY = Math.round(titleY + titleSize * 0.75 + (li + 0.8) * descLineHeight);
                    ctx.fillText(lines[li], startX, descY);
                }
            }
            ctx.restore();
        }

        ctx.restore();
        ctx.restore();
    }

    drawGlassShine(ctx) {
        // Upper hemisphere glass reflection arc
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, Math.PI, 0, false);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, -this.radius, 0, 0);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
        grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.04)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
    }

    drawPegs(ctx) {
        // Metallic pegs & LED studs around the rim
        const numPegs = Math.max(this.sectors.length, 24);
        const pegRadius = this.radius + 12;
        const sliceAngle = (Math.PI * 2) / numPegs;

        for (let i = 0; i < numPegs; i++) {
            const angle = i * sliceAngle + (this.isSpinning ? this.currentAngle : 0);
            const px = Math.cos(angle) * pegRadius;
            const py = Math.sin(angle) * pegRadius;

            // Stud shadow
            ctx.beginPath();
            ctx.arc(px, py + 1.5, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fill();

            // Stud metallic body
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            const pegGrad = ctx.createRadialGradient(px - 1, py - 1, 0.5, px, py, 4);
            
            // Twinkling lights during spin
            const isLit = this.isSpinning && ((i + Math.floor(this.ledOffset * 5)) % 4 === 0);

            if (this.halloweenMode) {
                // Seductive Halloween Embers & Glowing Blood Rubies
                if (isLit) {
                    pegGrad.addColorStop(0, '#ffffff');
                    pegGrad.addColorStop(0.3, '#ffedd5');
                    pegGrad.addColorStop(0.7, '#ea580c');
                    pegGrad.addColorStop(1, '#dc2626');
                } else {
                    pegGrad.addColorStop(0, '#fed7aa');
                    pegGrad.addColorStop(0.4, '#c2410c');
                    pegGrad.addColorStop(1, '#450a0a');
                }
            } else {
                if (isLit) {
                    pegGrad.addColorStop(0, '#ffffff');
                    pegGrad.addColorStop(0.5, '#fde047');
                    pegGrad.addColorStop(1, '#ca8a04');
                } else {
                    pegGrad.addColorStop(0, '#ffffff');
                    pegGrad.addColorStop(0.4, '#cbd5e1');
                    pegGrad.addColorStop(1, '#475569');
                }
            }

            ctx.fillStyle = pegGrad;
            ctx.fill();

            // Specular glint
            ctx.beginPath();
            ctx.arc(px - 1.2, py - 1.2, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fill();
        }
    }

    drawCenterHub(ctx) {
        const r = this.hubRadius;

        // Hub drop shadow
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 4, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowColor = this.halloweenMode ? 'rgba(225, 29, 72, 0.6)' : 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = this.halloweenMode ? 26 : 18;
        ctx.shadowOffsetY = 6;
        ctx.fill();
        ctx.restore();

        // 1. Outer metallic bezel ring
        const outerGrad = ctx.createLinearGradient(-r, -r, r, r);
        if (this.halloweenMode) {
            outerGrad.addColorStop(0, '#7f1d1d');
            outerGrad.addColorStop(0.3, '#1c1917');
            outerGrad.addColorStop(0.6, '#450a0a');
            outerGrad.addColorStop(1, '#0c0a09');
        } else {
            outerGrad.addColorStop(0, '#94a3b8');
            outerGrad.addColorStop(0.3, '#f1f5f9');
            outerGrad.addColorStop(0.6, '#334155');
            outerGrad.addColorStop(1, '#0f172a');
        }

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = outerGrad;
        ctx.fill();

        // 2. Concentric ring (Hot Orange/Ruby in Halloween mode)
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        const ringGrad = ctx.createLinearGradient(-r, -r, r, r);
        if (this.halloweenMode) {
            ringGrad.addColorStop(0, '#fed7aa');
            ringGrad.addColorStop(0.4, '#ea580c');
            ringGrad.addColorStop(0.8, '#e11d48');
            ringGrad.addColorStop(1, '#7f1d1d');
        } else {
            ringGrad.addColorStop(0, '#fef08a');
            ringGrad.addColorStop(0.5, '#d97706');
            ringGrad.addColorStop(1, '#fef08a');
        }
        ctx.strokeStyle = ringGrad;
        ctx.stroke();

        // 3. Inner Button Core (Clickable "ПУСК" Center)
        const innerR = r * 0.78;
        const btnGrad = ctx.createRadialGradient(0, -innerR * 0.3, 2, 0, 0, innerR);

        if (this.isSpinning) {
            btnGrad.addColorStop(0, '#450a0a');
            btnGrad.addColorStop(0.8, '#1f2937');
            btnGrad.addColorStop(1, '#0f172a');
        } else {
            if (this.halloweenMode) {
                // Sexy Seductive Vampire Ruby & Pumpkin Flame Core
                btnGrad.addColorStop(0, '#fb923c');
                btnGrad.addColorStop(0.35, '#ea580c');
                btnGrad.addColorStop(0.7, '#be123c');
                btnGrad.addColorStop(1, '#4c0519');
            } else {
                btnGrad.addColorStop(0, '#f59e0b');
                btnGrad.addColorStop(0.4, '#d97706');
                btnGrad.addColorStop(0.85, '#b45309');
                btnGrad.addColorStop(1, '#78350f');
            }
        }

        ctx.beginPath();
        ctx.arc(0, 0, innerR, 0, Math.PI * 2);
        ctx.fillStyle = btnGrad;
        ctx.fill();

        // Button glass sheen
        ctx.beginPath();
        ctx.arc(0, -innerR * 0.2, innerR * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();

        // Center Text: "🎃 ЖМИ" / "BOO!" or "ПУСК"
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fontSize = Math.max(10, innerR * 0.34);
        ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = this.halloweenMode ? 'rgba(234, 88, 12, 0.9)' : 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = this.halloweenMode ? 10 : 6;
        ctx.shadowOffsetY = 2;

        if (this.isSpinning) {
            ctx.fillText(this.halloweenMode ? '🦇...' : '...', 0, -1);
        } else {
            ctx.fillText(this.halloweenMode ? '🎃 SPIN' : 'SPIN', 0, -1);
        }
        ctx.restore();
    }

    drawPointer(ctx) {
        // Pointer is positioned at 12 o'clock pointing down onto the rim
        const pointerY = -this.radius + 4;
        const pointerLength = 50 * (this.radius / 260);
        const pointerWidth = 26 * (this.radius / 260);

        ctx.save();
        ctx.translate(0, pointerY);
        
        // Apply physics flapper deflection angle
        ctx.rotate(this.pointerFlapperAngle);

        // Pointer drop shadow on wheel surface
        ctx.beginPath();
        ctx.moveTo(0, pointerLength);
        ctx.lineTo(-pointerWidth / 2, -pointerLength * 0.4);
        ctx.lineTo(pointerWidth / 2, -pointerLength * 0.4);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowColor = this.halloweenMode ? 'rgba(239, 68, 68, 0.6)' : 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 6;
        ctx.fill();

        // Pointer Needle Body (Stiletto Dagger / Vampire Fang in Halloween mode)
        ctx.beginPath();
        ctx.moveTo(0, pointerLength); // Tip pointing down into sector
        ctx.lineTo(-pointerWidth / 2, -pointerLength * 0.35);
        ctx.lineTo(0, -pointerLength * 0.52);
        ctx.lineTo(pointerWidth / 2, -pointerLength * 0.35);
        ctx.closePath();

        const needleGrad = ctx.createLinearGradient(-pointerWidth / 2, 0, pointerWidth / 2, 0);
        if (this.halloweenMode) {
            needleGrad.addColorStop(0, '#991b1b');
            needleGrad.addColorStop(0.4, '#e11d48');
            needleGrad.addColorStop(0.6, '#fb7185');
            needleGrad.addColorStop(1, '#881337');
        } else {
            needleGrad.addColorStop(0, '#dc2626');
            needleGrad.addColorStop(0.45, '#ef4444');
            needleGrad.addColorStop(0.55, '#f87171');
            needleGrad.addColorStop(1, '#991b1b');
        }

        ctx.fillStyle = needleGrad;
        ctx.fill();

        // Golden/Blood-Orange bezel around pointer
        ctx.lineWidth = 2.5;
        const goldStroke = ctx.createLinearGradient(0, -pointerLength, 0, pointerLength);
        if (this.halloweenMode) {
            goldStroke.addColorStop(0, '#fed7aa');
            goldStroke.addColorStop(0.5, '#ea580c');
            goldStroke.addColorStop(1, '#e11d48');
        } else {
            goldStroke.addColorStop(0, '#fef08a');
            goldStroke.addColorStop(0.5, '#d97706');
            goldStroke.addColorStop(1, '#fef08a');
        }
        ctx.strokeStyle = goldStroke;
        ctx.stroke();

        // Glowing Jewel Cap on Pointer Base (Blood Drop / Vampire Gem)
        ctx.beginPath();
        ctx.arc(0, -pointerLength * 0.35, pointerWidth * 0.38, 0, Math.PI * 2);
        const jewelGrad = ctx.createRadialGradient(-2, -pointerLength * 0.35 - 2, 1, 0, -pointerLength * 0.35, pointerWidth * 0.38);
        if (this.halloweenMode) {
            jewelGrad.addColorStop(0, '#ffffff');
            jewelGrad.addColorStop(0.3, '#f43f5e');
            jewelGrad.addColorStop(0.8, '#881337');
            jewelGrad.addColorStop(1, '#0f050a');
        } else {
            jewelGrad.addColorStop(0, '#ffffff');
            jewelGrad.addColorStop(0.4, '#e2e8f0');
            jewelGrad.addColorStop(0.8, '#475569');
            jewelGrad.addColorStop(1, '#0f172a');
        }
        ctx.fillStyle = jewelGrad;
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = this.halloweenMode ? '#f97316' : '#f59e0b';
        ctx.stroke();

        ctx.restore();
    }

    // Interactive Mouse Handlers
    handleMouseMove(e) {
        if (this.isSpinning) return;
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left - this.cx;
        const my = e.clientY - rect.top - this.cy;
        const dist = Math.hypot(mx, my);

        if (dist <= this.hubRadius * 0.8) {
            this.canvas.style.cursor = 'pointer';
            this.hoveredSectorIndex = -1;
            if (this.onSectorHover) this.onSectorHover(null, e);
            return;
        }

        if (dist >= this.hubRadius && dist <= this.radius) {
            this.canvas.style.cursor = 'pointer'; // Show pointer so users know sectors can be clicked to edit
            // Calculate angle
            let angle = Math.atan2(my, mx);
            if (angle < 0) angle += Math.PI * 2;
            const secIdx = this.getSectorAtAngle(angle);
            if (secIdx !== this.hoveredSectorIndex) {
                this.hoveredSectorIndex = secIdx;
                if (this.onSectorHover) {
                    this.onSectorHover(this.sectors[secIdx], e);
                }
            }
        } else {
            this.canvas.style.cursor = 'default';
            if (this.hoveredSectorIndex !== -1) {
                this.hoveredSectorIndex = -1;
                if (this.onSectorHover) this.onSectorHover(null, e);
            }
        }
    }

    handleMouseLeave() {
        if (this.hoveredSectorIndex !== -1) {
            this.hoveredSectorIndex = -1;
            if (this.onSectorHover) this.onSectorHover(null);
        }
    }

    handleClick(e) {
        if (this.isSpinning) return;
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left - this.cx;
        const my = e.clientY - rect.top - this.cy;
        const dist = Math.hypot(mx, my);

        // Click on center hub spins the wheel
        if (dist <= this.hubRadius * 0.8) {
            this.spin();
            return;
        }

        // Click on any sector opens it for direct editing!
        if (dist >= this.hubRadius && dist <= this.radius) {
            let angle = Math.atan2(my, mx);
            if (angle < 0) angle += Math.PI * 2;
            const secIdx = this.getSectorAtAngle(angle);
            if (secIdx >= 0 && secIdx < this.sectors.length && this.onSectorClick) {
                this.onSectorClick(this.sectors[secIdx], secIdx);
            }
        }
    }

    // Helper Utilities
    truncateText(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) return text;
        let str = text;
        while (str.length > 1 && ctx.measureText(str + '…').width > maxWidth) {
            str = str.slice(0, -1);
        }
        return str + '…';
    }

    getContrastingTextColor(hexColor) {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) || 0;
        const g = parseInt(hex.substr(2, 2), 16) || 0;
        const b = parseInt(hex.substr(4, 2), 16) || 0;
        // ITU-R BT.709 perceived luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.62 ? '#0f172a' : '#ffffff';
    }

    adjustBrightness(hexColor, percent) {
        const hex = hexColor.replace('#', '');
        const r = Math.min(255, Math.max(0, parseInt(hex.substr(0, 2), 16) + percent));
        const g = Math.min(255, Math.max(0, parseInt(hex.substr(2, 2), 16) + percent));
        const b = Math.min(255, Math.max(0, parseInt(hex.substr(4, 2), 16) + percent));
        return `rgb(${r}, ${g}, ${b})`;
    }
}

window.FortuneWheel = FortuneWheel;
