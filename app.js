/**
 * Main Application Controller for FortuneWheel (English Edition)
 * State orchestration, LocalStorage sync, UI interactions, import/export
 */

(function () {
    'use strict';

    // Sexy Halloween & Luxury Color Swatches Palette
    const PALETTE_COLORS = [
        '#be123c', '#e11d48', '#ea580c', '#f97316',
        '#7e22ce', '#9333ea', '#4c1d95', '#10b981',
        '#0f766e', '#18181b', '#d97706', '#dc2626'
    ];

    class FortuneWheelApp {
        constructor() {
            this.wheel = null;
            this.sectors = [];
            this.history = [];
            this.zoomScale = 1.0;
            this.editingSectorId = null;
            this.activePresetKey = 'halloween';
            this.selectedFormColor = PALETTE_COLORS[0];
            this.zenMode = false;
            this.halloweenMode = true;

            this.dom = {};
            this.init();
        }

        init() {
            this.cacheDom();
            this.loadState();
            this.initWheel();
            this.renderPaletteSwatches();
            this.renderSectorsList();
            this.renderHistory();
            this.bindEvents();
            this.applyTheme();
            this.updateSoundIcon();
            this.updateZoomDisplay();
        }

        cacheDom() {
            this.dom = {
                header: document.getElementById('app-header'),
                canvas: document.getElementById('wheel-canvas'),
                canvasWrapper: document.getElementById('wheel-canvas-wrapper'),
                btnThemeToggle: document.getElementById('btn-theme-toggle'),
                themeBtnIcon: document.getElementById('theme-btn-icon'),
                themeBtnLabel: document.getElementById('theme-btn-label'),
                brandSubLabel: document.getElementById('brand-sub-label'),
                btnSpin: document.getElementById('btn-spin'),
                spinBtnText: document.getElementById('spin-btn-text'),
                btnSound: document.getElementById('btn-sound'),
                iconSoundOn: document.getElementById('icon-sound-on'),
                iconSoundOff: document.getElementById('icon-sound-off'),
                btnFullscreen: document.getElementById('btn-fullscreen'),
                iconFsEnter: document.getElementById('icon-fs-enter'),
                iconFsExit: document.getElementById('icon-fs-exit'),
                btnPresets: document.getElementById('btn-presets'),
                presetsDropdown: document.getElementById('presets-dropdown'),
                btnOpenSettings: document.getElementById('btn-open-settings'),
                btnCloseSettings: document.getElementById('btn-close-settings'),
                drawerSettings: document.getElementById('drawer-settings'),
                drawerBodySettings: document.getElementById('drawer-body-settings'),
                btnOpenHistory: document.getElementById('btn-open-history'),
                btnCloseHistory: document.getElementById('btn-close-history'),
                drawerHistory: document.getElementById('drawer-history'),
                drawerBackdrop: document.getElementById('drawer-backdrop'),
                historyBadge: document.getElementById('history-badge'),
                sectorsBadge: document.getElementById('sectors-badge'),
                sectorsCountLabel: document.getElementById('sectors-count-label'),
                sectorsList: document.getElementById('sectors-list'),
                btnAddSectorTrigger: document.getElementById('btn-add-sector-trigger'),
                sectorFormCard: document.getElementById('sector-form-card'),
                formCardTitle: document.getElementById('form-card-title'),
                inputSectorTitle: document.getElementById('input-sector-title'),
                inputSectorDesc: document.getElementById('input-sector-desc'),
                inputSectorColor: document.getElementById('input-sector-color'),
                colorHexLabel: document.getElementById('color-hex-label'),
                paletteSwatches: document.getElementById('palette-swatches'),
                btnSaveSector: document.getElementById('btn-save-sector'),
                btnCancelForm: document.getElementById('btn-cancel-form'),
                btnCancelSectorForm: document.getElementById('btn-cancel-sector-form'),
                btnExportJson: document.getElementById('btn-export-json'),
                btnImportJsonTrigger: document.getElementById('btn-import-json-trigger'),
                inputImportFile: document.getElementById('input-import-file'),
                btnResetDefault: document.getElementById('btn-reset-default'),
                statTotalSpins: document.getElementById('stat-total-spins'),
                statLastWin: document.getElementById('stat-last-win'),
                historyList: document.getElementById('history-list'),
                btnClearHistory: document.getElementById('btn-clear-history'),
                btnZoomIn: document.getElementById('btn-zoom-in'),
                btnZoomOut: document.getElementById('btn-zoom-out'),
                btnZoomReset: document.getElementById('btn-zoom-reset'),
                zoomValue: document.getElementById('zoom-value'),
                btnZenMode: document.getElementById('btn-zen-mode'),
                winnerModal: document.getElementById('winner-modal'),
                winnerTitle: document.getElementById('winner-title'),
                winnerDescription: document.getElementById('winner-description'),
                winnerColorStrip: document.getElementById('winner-color-strip'),
                winnerBadgeText: document.getElementById('winner-badge-text'),
                winnerTrophyIcon: document.getElementById('winner-trophy-icon'),
                btnCloseWinnerModal: document.getElementById('btn-close-winner-modal'),
                btnCopyWinner: document.getElementById('btn-copy-winner'),
                btnModalSpinAgain: document.getElementById('btn-modal-spin-again'),
                tooltip: document.getElementById('sector-hover-tooltip'),
                tooltipBadge: document.getElementById('tooltip-color-badge'),
                tooltipTitle: document.getElementById('tooltip-title'),
                tooltipDesc: document.getElementById('tooltip-desc'),
                toastContainer: document.getElementById('toast-container')
            };
        }

        loadState() {
            // Load theme
            const savedTheme = localStorage.getItem('fortunewheel_theme');
            if (savedTheme !== null) {
                this.halloweenMode = savedTheme === 'halloween';
            } else {
                this.halloweenMode = true; // Sexy Halloween by default!
            }

            // Load sectors from LocalStorage (English v1)
            try {
                const savedSectors = localStorage.getItem('fortunewheel_sectors_en_v1');
                if (savedSectors) {
                    this.sectors = JSON.parse(savedSectors);
                }
            } catch (e) {
                console.error('Error loading sectors from localStorage', e);
            }

            if (!Array.isArray(this.sectors) || this.sectors.length === 0) {
                // Load default preset (Halloween English!)
                this.sectors = JSON.parse(JSON.stringify(window.WheelPresets.halloween.sectors));
                this.activePresetKey = 'halloween';
                this.saveSectors();
            }

            // Load spin history
            try {
                const savedHistory = localStorage.getItem('fortunewheel_history_en_v1');
                if (savedHistory) {
                    this.history = JSON.parse(savedHistory);
                }
            } catch (e) {
                this.history = [];
            }

            // Load zoom scale
            const savedZoom = localStorage.getItem('fortunewheel_zoom');
            if (savedZoom) {
                this.zoomScale = parseFloat(savedZoom) || 1.0;
            }
        }

        saveSectors() {
            try {
                localStorage.setItem('fortunewheel_sectors_en_v1', JSON.stringify(this.sectors));
            } catch (e) {
                console.error('Failed to save sectors to localStorage', e);
            }
            this.updateSectorsBadge();
        }

        saveHistory() {
            try {
                localStorage.setItem('fortunewheel_history_en_v1', JSON.stringify(this.history));
            } catch (e) {}
            this.updateHistoryBadge();
        }

        saveTheme() {
            try {
                localStorage.setItem('fortunewheel_theme', this.halloweenMode ? 'halloween' : 'luxury');
            } catch (e) {}
        }

        saveZoom() {
            try {
                localStorage.setItem('fortunewheel_zoom', this.zoomScale.toString());
            } catch (e) {}
        }

        applyTheme() {
            if (this.halloweenMode) {
                document.body.classList.add('theme-halloween');
                document.body.classList.remove('theme-luxury');
                this.dom.themeBtnIcon.textContent = '🎃';
                this.dom.themeBtnLabel.textContent = 'Halloween';
                this.dom.brandSubLabel.textContent = '🎃 Sexy Halloween Edition 🩸';
                this.dom.spinBtnText.textContent = 'SPIN THE WHEEL 🎃';
            } else {
                document.body.classList.remove('theme-halloween');
                document.body.classList.add('theme-luxury');
                this.dom.themeBtnIcon.textContent = '✨';
                this.dom.themeBtnLabel.textContent = 'Classic';
                this.dom.brandSubLabel.textContent = 'Interactive Lucky Wheel';
                this.dom.spinBtnText.textContent = 'SPIN THE WHEEL';
            }

            if (this.wheel) {
                this.wheel.setHalloweenMode(this.halloweenMode);
            }
            if (window.Sound) {
                window.Sound.setHalloweenMode(this.halloweenMode);
            }
            if (window.Confetti) {
                window.Confetti.setHalloweenMode(this.halloweenMode);
            }
        }

        toggleTheme() {
            this.halloweenMode = !this.halloweenMode;
            this.saveTheme();
            this.applyTheme();
            this.showToast(this.halloweenMode ? '🎃 Sexy Halloween Activated!' : '✨ Classic Luxury Theme Enabled');
        }

        initWheel() {
            this.wheel = new window.FortuneWheel(this.dom.canvas, {
                sectors: this.sectors,
                halloweenMode: this.halloweenMode,
                onSpinStart: () => {
                    this.dom.btnSpin.disabled = true;
                    this.closeDrawers();
                    this.hideTooltip();
                    window.Sound.playSpinLaunch();
                },
                onTick: (speedFraction) => {
                    window.Sound.playTick(speedFraction);
                },
                onSpinEnd: (winningSector) => {
                    this.dom.btnSpin.disabled = false;
                    this.handleWin(winningSector);
                },
                onSectorHover: (sector, event) => {
                    this.handleSectorHover(sector, event);
                },
                // Direct click on sector to edit!
                onSectorClick: (sector, index) => {
                    this.editSectorDirectly(sector);
                }
            });

            this.wheel.setScale(this.zoomScale);
            this.updateSectorsBadge();
            this.updateHistoryBadge();
        }

        bindEvents() {
            // Theme Toggle Button
            if (this.dom.btnThemeToggle) {
                this.dom.btnThemeToggle.addEventListener('click', () => this.toggleTheme());
            }

            // Spin Trigger buttons
            this.dom.btnSpin.addEventListener('click', () => this.spin());
            this.dom.btnModalSpinAgain.addEventListener('click', () => {
                this.closeWinnerModal();
                setTimeout(() => this.spin(), 200);
            });

            // Spacebar shortcut for spinning
            window.addEventListener('keydown', (e) => {
                // If focus is in an input or textarea, ignore shortcuts
                if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

                if (e.code === 'Space') {
                    e.preventDefault();
                    this.spin();
                } else if (e.key === 'f' || e.key === 'F') {
                    this.toggleFullscreen();
                } else if (e.key === 'Escape') {
                    this.closeDrawers();
                    this.closeWinnerModal();
                    this.closeDropdowns();
                } else if (e.key === '+' || e.key === '=') {
                    this.setZoom(this.zoomScale + 0.1);
                } else if (e.key === '-' || e.key === '_') {
                    this.setZoom(this.zoomScale - 0.1);
                }
            });

            // Presets Dropdown
            this.dom.btnPresets.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dom.presetsDropdown.classList.toggle('active');
            });

            document.querySelectorAll('.dropdown-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const presetKey = btn.dataset.preset;
                    this.loadPreset(presetKey);
                    this.closeDropdowns();
                });
            });

            document.addEventListener('click', () => this.closeDropdowns());

            // Sound Toggle
            this.dom.btnSound.addEventListener('click', () => {
                const isMuted = window.Sound.toggleMute();
                this.updateSoundIcon();
                this.showToast(isMuted ? 'Sound muted' : 'Sound unmuted');
            });

            // Fullscreen Toggle
            this.dom.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
            document.addEventListener('fullscreenchange', () => this.updateFullscreenIcon());

            // Drawers Toggle
            this.dom.btnOpenSettings.addEventListener('click', () => this.openDrawer(this.dom.drawerSettings));
            this.dom.btnCloseSettings.addEventListener('click', () => this.closeDrawers());
            this.dom.btnOpenHistory.addEventListener('click', () => this.openDrawer(this.dom.drawerHistory));
            this.dom.btnCloseHistory.addEventListener('click', () => this.closeDrawers());
            this.dom.drawerBackdrop.addEventListener('click', () => this.closeDrawers());

            // Add Sector Trigger
            this.dom.btnAddSectorTrigger.addEventListener('click', () => this.openSectorForm());
            this.dom.btnCancelForm.addEventListener('click', () => this.closeSectorForm());
            this.dom.btnCancelSectorForm.addEventListener('click', () => this.closeSectorForm());
            this.dom.btnSaveSector.addEventListener('click', () => this.saveSectorFromForm());

            // Color inputs sync
            this.dom.inputSectorColor.addEventListener('input', (e) => {
                this.selectedFormColor = e.target.value;
                this.dom.colorHexLabel.textContent = e.target.value.toUpperCase();
                this.clearPaletteSelection();
            });

            // Export & Import JSON
            this.dom.btnExportJson.addEventListener('click', () => this.exportJson());
            this.dom.btnImportJsonTrigger.addEventListener('click', () => this.dom.inputImportFile.click());
            this.dom.inputImportFile.addEventListener('change', (e) => this.importJson(e));

            // Reset to defaults
            this.dom.btnResetDefault.addEventListener('click', () => {
                if (confirm('Reset wheel sectors to the default template? Current custom changes will be replaced.')) {
                    this.loadPreset(this.halloweenMode ? 'halloween' : 'prizes');
                    this.showToast('Wheel reset to default template');
                }
            });

            // Clear history
            this.dom.btnClearHistory.addEventListener('click', () => {
                if (this.history.length === 0) return;
                if (confirm('Clear all spin history logs?')) {
                    this.history = [];
                    this.saveHistory();
                    this.renderHistory();
                    this.showToast('Spin history cleared');
                }
            });

            // Zoom controls
            this.dom.btnZoomIn.addEventListener('click', () => this.setZoom(this.zoomScale + 0.1));
            this.dom.btnZoomOut.addEventListener('click', () => this.setZoom(this.zoomScale - 0.1));
            this.dom.btnZoomReset.addEventListener('click', () => this.setZoom(1.0));

            // Zen Mode
            this.dom.btnZenMode.addEventListener('click', () => this.toggleZenMode());

            // Winner Modal Close & Copy
            this.dom.btnCloseWinnerModal.addEventListener('click', () => this.closeWinnerModal());
            this.dom.winnerModal.addEventListener('click', (e) => {
                if (e.target === this.dom.winnerModal) this.closeWinnerModal();
            });
            this.dom.btnCopyWinner.addEventListener('click', () => this.copyWinnerDetails());
        }

        spin() {
            if (this.wheel.isSpinning) return;
            if (this.sectors.length < 2) {
                this.showToast('Please add at least 2 sectors to spin the wheel');
                this.openDrawer(this.dom.drawerSettings);
                return;
            }
            this.wheel.spin();
        }

        handleWin(sector) {
            // Play victory sound
            window.Sound.playWin();

            // Trigger magnificent confetti explosion (with bats & pumpkins in Halloween mode)
            window.Confetti.burst(window.innerWidth / 2, window.innerHeight * 0.45, 150);
            setTimeout(() => window.Confetti.cannonSide(85), 320);

            // Add to history
            const historyEntry = {
                id: 'h_' + Date.now(),
                sectorId: sector.id,
                title: sector.title,
                description: sector.description,
                color: sector.color,
                timestamp: new Date().toISOString()
            };
            this.history.unshift(historyEntry);
            if (this.history.length > 100) this.history.pop();
            this.saveHistory();
            this.renderHistory();

            // Populate celebration badge
            if (this.dom.winnerBadgeText) {
                this.dom.winnerBadgeText.textContent = this.halloweenMode ? 'YOUR FATAL REWARD' : 'LUCKY WINNER';
            }
            if (this.dom.winnerTrophyIcon) {
                this.dom.winnerTrophyIcon.textContent = this.halloweenMode ? '🦇 🎃 🩸' : '🏆';
            }

            // Populate and show winner modal
            this.dom.winnerTitle.textContent = sector.title;
            this.dom.winnerDescription.textContent = sector.description || 'Congratulations on landing this sector!';
            this.dom.winnerColorStrip.style.background = sector.color || (this.halloweenMode ? '#ea580c' : '#f59e0b');
            this.dom.winnerModal.classList.remove('hidden');
        }

        closeWinnerModal() {
            this.dom.winnerModal.classList.add('hidden');
        }

        copyWinnerDetails() {
            const title = this.dom.winnerTitle.textContent;
            const desc = this.dom.winnerDescription.textContent;
            const textToCopy = this.halloweenMode 
                ? `🎃 Landed Sector: ${title}\n🩸 Description: ${desc}`
                : `🏆 Landed Sector: ${title}\n📝 Description: ${desc}`;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    this.showToast('Result copied to clipboard!');
                }).catch(() => {
                    this.fallbackCopy(textToCopy);
                });
            } else {
                this.fallbackCopy(textToCopy);
            }
        }

        fallbackCopy(text) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            this.showToast('Result copied!');
        }

        handleSectorHover(sector, event) {
            if (!sector || !event) {
                this.hideTooltip();
                return;
            }

            this.dom.tooltipTitle.textContent = sector.title;
            this.dom.tooltipDesc.textContent = sector.description || 'No description provided';
            this.dom.tooltipBadge.style.background = sector.color;

            // Position tooltip near cursor with safe screen bounds
            const x = Math.min(window.innerWidth - 340, Math.max(16, event.clientX + 16));
            const y = Math.min(window.innerHeight - 150, Math.max(16, event.clientY + 16));

            this.dom.tooltip.style.left = `${x}px`;
            this.dom.tooltip.style.top = `${y}px`;
            this.dom.tooltip.classList.add('active');
        }

        hideTooltip() {
            this.dom.tooltip.classList.remove('active');
        }

        // Direct editing helper
        editSectorDirectly(sector) {
            this.openDrawer(this.dom.drawerSettings);
            this.openSectorForm(sector);
            this.showToast(`Editing sector: ${sector.title}`);
        }

        // Palette & Sector Form Management
        renderPaletteSwatches() {
            this.dom.paletteSwatches.innerHTML = '';
            PALETTE_COLORS.forEach(color => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'color-swatch-btn';
                btn.style.backgroundColor = color;
                btn.title = color;
                if (color.toLowerCase() === this.selectedFormColor.toLowerCase()) {
                    btn.classList.add('selected');
                }
                btn.addEventListener('click', () => {
                    this.selectedFormColor = color;
                    this.dom.inputSectorColor.value = color;
                    this.dom.colorHexLabel.textContent = color.toUpperCase();
                    this.updatePaletteSelection(color);
                });
                this.dom.paletteSwatches.appendChild(btn);
            });
        }

        updatePaletteSelection(selectedColor) {
            const buttons = this.dom.paletteSwatches.querySelectorAll('.color-swatch-btn');
            buttons.forEach(btn => {
                if (btn.title.toLowerCase() === selectedColor.toLowerCase()) {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            });
        }

        clearPaletteSelection() {
            const buttons = this.dom.paletteSwatches.querySelectorAll('.color-swatch-btn');
            buttons.forEach(btn => btn.classList.remove('selected'));
        }

        openSectorForm(sectorToEdit = null) {
            this.dom.sectorFormCard.classList.remove('hidden');
            this.dom.sectorFormCard.classList.remove('highlight');
            void this.dom.sectorFormCard.offsetWidth; // Force reflow
            this.dom.sectorFormCard.classList.add('highlight');

            if (sectorToEdit) {
                this.editingSectorId = sectorToEdit.id;
                this.dom.formCardTitle.textContent = 'Edit Sector';
                this.dom.inputSectorTitle.value = sectorToEdit.title;
                this.dom.inputSectorDesc.value = sectorToEdit.description || '';
                this.selectedFormColor = sectorToEdit.color || PALETTE_COLORS[0];
            } else {
                this.editingSectorId = null;
                this.dom.formCardTitle.textContent = 'Add New Sector';
                this.dom.inputSectorTitle.value = '';
                this.dom.inputSectorDesc.value = '';
                const nextColorIndex = this.sectors.length % PALETTE_COLORS.length;
                this.selectedFormColor = PALETTE_COLORS[nextColorIndex];
            }

            this.dom.inputSectorColor.value = this.selectedFormColor;
            this.dom.colorHexLabel.textContent = this.selectedFormColor.toUpperCase();
            this.updatePaletteSelection(this.selectedFormColor);

            // Auto-scroll drawer to top so the form is immediately prominent
            if (this.dom.drawerBodySettings) {
                this.dom.drawerBodySettings.scrollTo({ top: 0, behavior: 'smooth' });
            }

            setTimeout(() => {
                this.dom.inputSectorTitle.focus();
            }, 100);
        }

        closeSectorForm() {
            this.dom.sectorFormCard.classList.add('hidden');
            this.editingSectorId = null;
        }

        saveSectorFromForm() {
            const title = this.dom.inputSectorTitle.value.trim();
            const desc = this.dom.inputSectorDesc.value.trim();
            const color = this.selectedFormColor || this.dom.inputSectorColor.value;

            if (!title) {
                this.showToast('Please enter a sector title');
                this.dom.inputSectorTitle.focus();
                return;
            }

            if (this.editingSectorId) {
                // Edit existing sector
                const idx = this.sectors.findIndex(s => s.id === this.editingSectorId);
                if (idx !== -1) {
                    this.sectors[idx].title = title;
                    this.sectors[idx].description = desc;
                    this.sectors[idx].color = color;
                    this.showToast('Sector updated!');
                }
            } else {
                // Create new sector
                const newSector = {
                    id: 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    title: title,
                    description: desc,
                    color: color
                };
                this.sectors.push(newSector);
                this.showToast('New sector added!');
            }

            this.saveSectors();
            this.wheel.setSectors(this.sectors);
            this.renderSectorsList();
            this.closeSectorForm();
        }

        deleteSector(id) {
            if (this.sectors.length <= 2) {
                this.showToast('The wheel must keep at least 2 sectors');
                return;
            }

            const sector = this.sectors.find(s => s.id === id);
            if (!sector) return;

            if (confirm(`Delete sector "${sector.title}"?`)) {
                this.sectors = this.sectors.filter(s => s.id !== id);
                this.saveSectors();
                this.wheel.setSectors(this.sectors);
                this.renderSectorsList();
                this.showToast('Sector deleted');
            }
        }

        moveSector(index, direction) {
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= this.sectors.length) return;

            const temp = this.sectors[index];
            this.sectors[index] = this.sectors[targetIndex];
            this.sectors[targetIndex] = temp;

            this.saveSectors();
            this.wheel.setSectors(this.sectors);
            this.renderSectorsList();
        }

        renderSectorsList() {
            this.dom.sectorsList.innerHTML = '';
            this.dom.sectorsCountLabel.textContent = this.sectors.length.toString();

            this.sectors.forEach((sec, idx) => {
                const card = document.createElement('div');
                card.className = 'sector-item-card';
                card.title = 'Click to edit this sector';

                // Clicking anywhere on card opens it for editing
                card.addEventListener('click', () => {
                    this.openSectorForm(sec);
                });

                const colorDot = document.createElement('div');
                colorDot.className = 'sector-item-color';
                colorDot.style.backgroundColor = sec.color;

                const info = document.createElement('div');
                info.className = 'sector-item-info';

                const title = document.createElement('div');
                title.className = 'sector-item-title';
                title.textContent = `${idx + 1}. ${sec.title}`;

                const desc = document.createElement('div');
                desc.className = 'sector-item-desc';
                desc.textContent = sec.description || 'No description';

                info.appendChild(title);
                info.appendChild(desc);

                const actions = document.createElement('div');
                actions.className = 'sector-item-actions';

                // Explicit Edit Badge button
                const btnEdit = document.createElement('button');
                btnEdit.type = 'button';
                btnEdit.className = 'btn-item-edit-badge';
                btnEdit.textContent = 'Edit';
                btnEdit.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openSectorForm(sec);
                });
                actions.appendChild(btnEdit);

                // Move Up
                if (idx > 0) {
                    const btnUp = document.createElement('button');
                    btnUp.type = 'button';
                    btnUp.className = 'btn-item-action';
                    btnUp.title = 'Move Up';
                    btnUp.innerHTML = '▲';
                    btnUp.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.moveSector(idx, -1);
                    });
                    actions.appendChild(btnUp);
                }

                // Move Down
                if (idx < this.sectors.length - 1) {
                    const btnDown = document.createElement('button');
                    btnDown.type = 'button';
                    btnDown.className = 'btn-item-action';
                    btnDown.title = 'Move Down';
                    btnDown.innerHTML = '▼';
                    btnDown.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.moveSector(idx, 1);
                    });
                    actions.appendChild(btnDown);
                }

                // Delete Button
                const btnDelete = document.createElement('button');
                btnDelete.type = 'button';
                btnDelete.className = 'btn-item-action action-delete';
                btnDelete.title = 'Delete sector';
                btnDelete.innerHTML = `
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                `;
                btnDelete.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteSector(sec.id);
                });
                actions.appendChild(btnDelete);

                card.appendChild(colorDot);
                card.appendChild(info);
                card.appendChild(actions);

                this.dom.sectorsList.appendChild(card);
            });
        }

        renderHistory() {
            this.dom.historyList.innerHTML = '';
            this.dom.statTotalSpins.textContent = this.history.length.toString();

            if (this.history.length === 0) {
                this.dom.statLastWin.textContent = '—';
                const empty = document.createElement('div');
                empty.className = 'empty-state';
                empty.textContent = 'No spins yet. Click "SPIN THE WHEEL" to test your fortune!';
                this.dom.historyList.appendChild(empty);
                return;
            }

            this.dom.statLastWin.textContent = this.history[0].title;

            this.history.forEach(item => {
                const card = document.createElement('div');
                card.className = 'history-item-card';

                const badge = document.createElement('div');
                badge.className = 'history-item-badge';
                badge.style.backgroundColor = item.color || '#ea580c';

                const content = document.createElement('div');
                content.className = 'history-item-content';

                const top = document.createElement('div');
                top.className = 'history-item-top';

                const title = document.createElement('div');
                title.className = 'history-item-title';
                title.textContent = item.title;

                const time = document.createElement('div');
                time.className = 'history-item-time';
                time.textContent = this.formatDate(item.timestamp);

                top.appendChild(title);
                top.appendChild(time);

                content.appendChild(top);

                if (item.description) {
                    const desc = document.createElement('div');
                    desc.className = 'history-item-desc';
                    desc.textContent = item.description;
                    content.appendChild(desc);
                }

                card.appendChild(badge);
                card.appendChild(content);

                this.dom.historyList.appendChild(card);
            });
        }

        formatDate(isoString) {
            try {
                const date = new Date(isoString);
                return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
                       ', ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } catch (e) {
                return '';
            }
        }

        loadPreset(presetKey) {
            const preset = window.WheelPresets[presetKey];
            if (!preset) return;

            this.activePresetKey = presetKey;
            this.sectors = JSON.parse(JSON.stringify(preset.sectors));
            this.saveSectors();
            this.wheel.setSectors(this.sectors);
            this.renderSectorsList();
            this.showToast(`Loaded: ${preset.name}`);
        }

        exportJson() {
            const data = {
                version: '2.5',
                exportDate: new Date().toISOString(),
                presetName: window.WheelPresets[this.activePresetKey]?.name || 'Custom Wheel Pack',
                sectors: this.sectors
            };

            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `fortune-wheel-sectors-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showToast('JSON file exported successfully!');
        }

        importJson(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    let importedSectors = [];

                    if (Array.isArray(parsed)) {
                        importedSectors = parsed;
                    } else if (parsed && Array.isArray(parsed.sectors)) {
                        importedSectors = parsed.sectors;
                    }

                    if (importedSectors.length < 2) {
                        this.showToast('Imported file must contain at least 2 sectors');
                        return;
                    }

                    // Validate and format sectors
                    this.sectors = importedSectors.map((s, idx) => ({
                        id: s.id || ('s_' + Date.now() + '_' + idx),
                        title: (s.title || `Sector ${idx + 1}`).toString(),
                        description: (s.description || '').toString(),
                        color: s.color || PALETTE_COLORS[idx % PALETTE_COLORS.length]
                    }));

                    this.saveSectors();
                    this.wheel.setSectors(this.sectors);
                    this.renderSectorsList();
                    this.showToast(`Imported ${this.sectors.length} sectors!`);
                } catch (err) {
                    alert('Error reading JSON file. Please ensure the file format is valid.');
                } finally {
                    this.dom.inputImportFile.value = '';
                }
            };
            reader.readAsText(file);
        }

        // Drawers & Modals UI
        openDrawer(drawerElement) {
            this.closeDrawers();
            drawerElement.classList.add('open');
            this.dom.drawerBackdrop.classList.add('active');
        }

        closeDrawers() {
            this.dom.drawerSettings.classList.remove('open');
            this.dom.drawerHistory.classList.remove('open');
            this.dom.drawerBackdrop.classList.remove('active');
        }

        closeDropdowns() {
            this.dom.presetsDropdown.classList.remove('active');
        }

        // Zoom Scale Management
        setZoom(scale) {
            this.zoomScale = Math.max(0.6, Math.min(1.4, Math.round(scale * 10) / 10));
            this.wheel.setScale(this.zoomScale);
            this.saveZoom();
            this.updateZoomDisplay();
        }

        updateZoomDisplay() {
            this.dom.zoomValue.textContent = `${Math.round(this.zoomScale * 100)}%`;
        }

        // Fullscreen Mode
        toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }

        updateFullscreenIcon() {
            const isFs = !!document.fullscreenElement;
            this.dom.iconFsEnter.classList.toggle('hidden', isFs);
            this.dom.iconFsExit.classList.toggle('hidden', !isFs);
        }

        // Sound Icon
        updateSoundIcon() {
            const isMuted = window.Sound.isMuted;
            this.dom.iconSoundOn.classList.toggle('hidden', isMuted);
            this.dom.iconSoundOff.classList.toggle('hidden', !isMuted);
        }

        // Zen Mode
        toggleZenMode() {
            this.zenMode = !this.zenMode;
            this.dom.header.classList.toggle('hidden-zen', this.zenMode);
            this.showToast(this.zenMode ? 'Presentation mode (header hidden)' : 'Standard mode');
        }

        updateSectorsBadge() {
            this.dom.sectorsBadge.textContent = this.sectors.length.toString();
        }

        updateHistoryBadge() {
            this.dom.historyBadge.textContent = this.history.length.toString();
        }

        showToast(message) {
            const toast = document.createElement('div');
            toast.className = 'toast toast-success';
            toast.textContent = message;

            this.dom.toastContainer.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px)';
                toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                setTimeout(() => toast.remove(), 260);
            }, 3000);
        }
    }

    // Launch on DOM ready
    window.addEventListener('DOMContentLoaded', () => {
        window.App = new FortuneWheelApp();
    });
})();
