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
* **Interactive Preview:** The Sensors settings tab now features a beautiful live macOS Menu Bar Mockup. It shows exactly how your active sensors paginate, format, and align in real-time, matching your system theme.

---

## 🧪 Quick Verification
* Pre-build audits (static analysis, types, linting) are **100% green**.
* The automated test suite completed with **100% success** (7 unit tests passing).
