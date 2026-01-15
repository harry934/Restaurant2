// Inline CMS Editor
// Managed by Antigravity

(function() {
    const EDITOR_STYLES = `
        .cms-admin-bar {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: #1a1a1a;
            color: #fff;
            z-index: 10000;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            font-family: 'Poppins', sans-serif;
            transition: transform 0.3s ease;
        }
        .cms-admin-bar.hidden {
            transform: translateY(-100%);
        }
        .cms-toggle-btn {
            background: #f28123;
            color: #fff;
            border: none;
            padding: 5px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: background 0.2s;
        }
        .cms-toggle-btn:hover {
            background: #d66d1a;
        }
        .cms-toggle-btn.editing {
            background: #28a745;
        }
        .cms-editable-highlight {
            outline: 2px dashed #f28123 !important;
            transition: outline 0.2s;
            cursor: pointer;
        }
        .cms-editable-highlight:hover {
            background: rgba(242, 129, 35, 0.1) !important;
        }
        .cms-saving-indicator {
            font-size: 12px;
            margin-left: 10px;
            color: #aaa;
            display: none;
        }
    `;

    class InlineEditor {
        constructor() {
            this.isEditing = false;
            this.session = null;
            this.init();
        }

        async init() {
            this.session = SessionManager.getCurrentSession();
            if (!this.session || this.session.role !== 'super-admin') return;

            this.injectStyles();
            this.injectUI();
            this.setupListeners();
        }

        injectStyles() {
            const style = document.createElement('style');
            style.textContent = EDITOR_STYLES;
            document.head.appendChild(style);
        }

        injectUI() {
            const bar = document.createElement('div');
            bar.className = 'cms-admin-bar';
            bar.innerHTML = `
                <div>
                    <strong>CMS Admin:</strong> ${this.session.staffName}
                    <span id="cmsSaveIndicator" class="cms-saving-indicator">Saving...</span>
                </div>
                <div>
                    <button id="cmsToggleBtn" class="cms-toggle-btn">Enable Edit Mode</button>
                    <a href="/admin/dashboard.html" class="cms-toggle-btn" style="background:#333; margin-left:10px; text-decoration:none;">Dashboard</a>
                </div>
            `;
            document.body.appendChild(bar);
            document.body.style.paddingTop = '50px';
        }

        setupListeners() {
            const toggleBtn = document.getElementById('cmsToggleBtn');
            toggleBtn.addEventListener('click', () => this.toggleEditMode());

            // Handle content changes
            document.addEventListener('blur', (e) => {
                const target = e.target;
                if (this.isEditing && target.hasAttribute('data-cms-key')) {
                    this.saveChange(target);
                }
            }, true);
        }

        toggleEditMode() {
            this.isEditing = !this.isEditing;
            const toggleBtn = document.getElementById('cmsToggleBtn');
            const editableElements = document.querySelectorAll('[data-cms-key]');

            if (this.isEditing) {
                toggleBtn.textContent = 'Disable Edit Mode';
                toggleBtn.classList.add('editing');
                editableElements.forEach(el => {
                    el.contentEditable = 'true';
                    el.classList.add('cms-editable-highlight');
                });
            } else {
                toggleBtn.textContent = 'Enable Edit Mode';
                toggleBtn.classList.remove('editing');
                editableElements.forEach(el => {
                    el.contentEditable = 'false';
                    el.classList.remove('cms-editable-highlight');
                });
            }
        }

        async saveChange(element) {
            const key = element.getAttribute('data-cms-key');
            const value = element.innerHTML.trim();
            const indicator = document.getElementById('cmsSaveIndicator');

            indicator.style.display = 'inline';
            
            try {
                const updateData = {};
                // Handle nested keys like dealOfWeek.title
                if (key.includes('.')) {
                    const parts = key.split('.');
                    updateData[parts[0]] = {
                        ... (await this.getCurrentSettings())[parts[0]],
                        [parts[1]]: value
                    };
                } else {
                    updateData[key] = value;
                }

                const res = await adminFetch('/api/admin/settings/update', {
                    method: 'POST',
                    body: JSON.stringify(updateData)
                });

                if (res.ok) {
                    indicator.textContent = 'Saved!';
                    setTimeout(() => indicator.style.display = 'none', 2000);
                } else {
                    throw new Error('Save failed');
                }
            } catch (e) {
                console.error('CMS Save Error:', e);
                indicator.textContent = 'Error Saving!';
                indicator.style.color = '#ff4444';
            }
        }

        async getCurrentSettings() {
            const res = await fetch('/api/settings');
            return await res.json();
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new InlineEditor());
    } else {
        new InlineEditor();
    }
})();
