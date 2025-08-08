# Z-Index Layering Guidelines

This document outlines the z-index layering scheme used across the project to ensure consistent and predictable stacking of elements. These values are currently applied directly in component classes.

## General Principles

*   **Lower numbers for background elements.**
*   **Higher numbers for foreground elements.**
*   **Avoid using `!important` unless absolutely necessary.**
*   **Maintain a clear hierarchy to prevent conflicts.**

## Z-Index Scale

The following z-index values are used for key UI components:

*   **`z-0` (Default/Base):** Used for standard content layers.
    *   Examples: Map panes (`.leaflet-pane`), map controls (`.leaflet-control`).
*   **`z-50`:** A common utility class for elements that need to appear above most content but below critical UI.
    *   Examples: Standard dropdowns, popovers, and general overlays.
*   **`z-[1001]` (Header):** Reserved for the main application header. This ensures it always stays on top of the primary content and map.
    *   Examples: `Navigation` component (`<header>`).
*   **`z-[1002]` (Menu/Sheet/Dropdown Content):** Used for navigation menus, side sheets, and dropdown content that should appear above the header.
    *   Examples: `DropdownMenuContent`, `SheetContent`.
*   **`z-overlay` (1004):** Used for full-screen overlays that should cover almost everything, but still allow for modals on top.
    *   Examples: Map error overlay.

## Usage

When applying `z-index`, refer to this guide to choose the appropriate value. If a new layering context is introduced, consider how it fits into this existing scale.

**Note:** While some `z-index` values are currently hardcoded, the intention is to maintain this conceptual scale for clarity.
