# PR Summary: Customizable Menu Bar Pagination, Advanced Grouping, and Formatting

## 🚀 Overview
This Pull Request introduces major user-facing layout enhancements, advanced formatting controls, and native macOS integrations to give users absolute control over how Home Assistant sensors look and behave in the system menu bar.

---

## 🎨 User-Facing Features Added

### 1. Multi-Page Cycling & Pagination
* **Page Pagination:** Split menu bar sensors across multiple pages if they don't fit. Cycle through them automatically on an adjustable timer, or manually using a global keyboard shortcut.
* **Inactivity Auto-Return:** Automatically returns the menu bar to page 1 after a custom period of user inactivity.
* **Manual Page Breaks:** Add explicit `--- Page Break ---` separators to control exactly where pages split.

### 2. Grouping & Headers
* **Drag-and-Drop Categories:** Drag and drop sensors into custom groups with text-based dividers to keep the dropdown menu beautifully organized.

### 3. Advanced Math & Custom Formatting
* **Advanced Conversions:** Set custom multipliers (e.g., to divide bytes into megabytes), custom unit symbol overrides, and explicit decimal place precision per sensor.
* **Live Presets:** Formatting overrides are configured through easy, click-to-apply presets with instant preview pills.

### 4. Native macOS Baseline & Animation Polishing
* **Native Fade Transitions:** Adds a buttery-smooth macOS Core Animation ease-in-ease-out fade effect on page cycles.
* **Vertical Baseline Alignment:** Adjust whether Peek's text centers geometrically or aligns perfectly with the macOS system clock's baseline.
* **Surrounding Icon Stabilization:** Option to lock the physical width of Peek to the widest page, preventing adjacent system icons from shifting.

### 5. Live macOS Menu Bar Preview Mockup
* **Persistent "Freeze-Pane" Layout:** The live macOS Menu Bar Mockup is now persistently frozen/sticky at the bottom of both the **Sensors** and **Appearance** tabs, so you can see changes in real-time as you scroll.
* **Draggable Splitter Resizing:** Drag the horizontal handle at the top of the preview pane to resize its height (from `100px` to `450px`) to see multiple pages simultaneously without truncation. Your height is saved in `localStorage`.
* **Sleek Show/Hide Toggle:** Completely hide the preview pane to reclaim full screen space for editing, and easily restore it using the "Show Live Preview" button. State is persisted in `localStorage`.
* **Exact macOS Native Scale & Aesthetics:** Mockup bar sits at an exact `22px` native status bar height with floating text (transparent button idle states), exact typography scales, and a full-height hover highlight.

### 6. Robust Single-Instance Concurrency Protection
* **Single-Instance Guard:** Integrates `tauri-plugin-single-instance` into the Rust backend as the first registered plugin. If a user attempts to launch a second instance (manually or via concurrent autostart mechanisms), it intercepts the launch, focuses the existing preferences window, and gracefully exits.
* **Autostart Duplicate Cleanup:** Operates on diagnostic and surgical scripts (via AppleScript) to locate and cleanly delete duplicate/non-standard macOS Login Items while preserving the standard LaunchAgent configuration.

---

## 🧪 Quick Verification
* Pre-build audits (TypeScript compiler, ESLint static analysis) are **100% green with zero warnings or errors**.
* Rust backend compilation checks (`cargo check`) are **100% green and error-free**.
* The automated test suite completed with **100% success** (7 unit tests passing, including our custom config store recovery and validation tests).
