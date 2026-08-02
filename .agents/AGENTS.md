# VML AEM 360 Tool — AI Agent Rules & Workspace Guidelines

This file defines the technical guidelines, code style, security constraints, and workspace context for any AI Agent assisting on the **VML AEM 360 Tool** project.

---

## 📌 Project Context & Architecture

- **Project Name:** VML AEM 360 Tool
- **Repository Type:** Google Chrome Extension (Manifest V3)
- **Target Audience:** Internal VML Argentina - Engineering Team
- **Core Functionality:** A robust, high-performance asset injector to upload massive amounts of files and folders directly into AEM Cloud Service, circumventing native UI limitations.
- **Target Environment:** AEM as a Cloud Service (`https://*.adobeaemcloud.com/*`)

### Folder Structure

```text
vml-aem-360-tool/
├── manifest.json                  # Extension configuration (Manifest V3)
├── pack.ps1                       # PowerShell zip script for packaging/distribution
├── assets/
│   └── logo-vml.png               # Branding assets
├── core/
│   ├── content.css                # Injected CSS styles
│   ├── popup.css                  # UI styles (premium dark mode theme)
│   ├── popup.html                 # Main popup UI (clean layout)
│   └── popup-ui.js                # Core UI helper (handles versioning and tooltips)
├── json-examples/                 # Configuration JSON examples
├── test/                          # Unit testing suite
│   └── content-asset-renamer.test.js
└── modules/
    ├── asset-injector/            # Module for mass uploads
    │   ├── content-asset-injector.js
    │   ├── content-asset-renamer.js
    │   └── popup-asset-injector.js
    └── colorizer-creator/         # Module to manage exterior/interior colors & wheels
        ├── colorizer-creator.css
        ├── colorizer-creator.html
        ├── colorizer-creator.js
        └── popup-colorizer-creator.js
```

---

## 🛡️ Critical AppSec & Security Guidelines

Any AI agent modifying the codebase **must** adhere strictly to the following security rules:

1. **Strict DOM XSS Prevention (No innerHTML):**
   - **DO NOT** use `.innerHTML`, `outerHTML`, or `insertAdjacentHTML` when rendering user-submitted text or metadata.
   - **DO** construct DOM nodes programmatically using `document.createElement()` and apply text values exclusively via `.textContent` or `.innerText`.
2. **CSS Injection Prevention:**
   - Never construct dynamic CSS strings using raw user inputs. Opt for static styling rules in `content.css` and use class assignment (`classList.add`) or strictly validated types.
3. **Safe Iframe Traversal:**
   - Do not attempt cross-origin traversal which triggers browser security errors. Only query iframes that satisfy the **Same-Origin (CORS)** rule. Let other iframe entities fail silently.
4. **Isolated World Constraints:**
   - Keep in mind that content scripts execute in isolated scopes provided by Chrome. Do not rely on variables declared in the page's host scope, nor mutate properties on the host window object directly.
5. **Minimal Permissions:**
   - Restrict extension permissions in `manifest.json` to the minimum necessary (e.g., `activeTab`).

---

## 🤖 Agent Behavioral Instructions

When working on this repository, you must follow these instructions:

1. **Documentation Auto-Update Rule:**
   - Whenever you implement a new feature, modify existing functionality, or change the extension's behavior, you **MUST** automatically review and update:
     - The user-facing documentation in [README.md](file:///c:/Users/leandro.benac/Desktop/Proyectos%20Webs/vml-aem-360-tool/README.md) (keeping it clear, user-focused, and updated with any new usage steps).
     - Technical context or rules in this [AGENTS.md](file:///c:/Users/leandro.benac/Desktop/Proyectos%20Webs/vml-aem-360-tool/.agents/AGENTS.md) file if architecture or constraints change.
2. **Automatic Version Increment:**
   - When modifying files that impact functionality, remember that the version inside [manifest.json](file:///c:/Users/leandro.benac/Desktop/Proyectos%20Webs/vml-aem-360-tool/manifest.json) should be bumped by `0.1` (managed via local pre-commit hooks, but keep it in mind).
3. **Communication Preferences:**
   - Communicate with the user in their preferred language (e.g., **Spanish**).
   - Maintain all in-code comments, variables, and technical documentation in **English**.
