# Architecture Overview

LiteBI is a 100% client-side, offline-first Business Intelligence application. It processes data locally in the browser or desktop environment without requiring a heavy backend server.

## High-Level Architecture

The architecture is divided into the following main layers:

1. **Presentation Layer (Vue 3 + ECharts)**
   - Built with Vue 3 (Composition API).
   - Uses Apache ECharts for rendering interactive visualizations.
   - Manages UI state and complex layouts (Gridstack.js for dashboard grids).

2. **State Management (Pinia)**
   - Acts as the central nervous system for the UI.
   - Stores configurations, dashboard layouts, and active filters.
   - Interfaces directly with the Data Engine and Persistence layers.

3. **Data Engine (DuckDB WASM)**
   - The core analytical engine.
   - Runs WebAssembly (WASM) to process and query data locally at high speeds.
   - Handles SQL execution, data aggregation, and calculated columns.

4. **Persistence & Storage (IndexedDB / localForage)**
   - Ensures data survives browser refreshes and crashes.
   - Saves raw data blobs, DuckDB database states, and Pinia stores locally.

5. **Collaboration System (Yjs + WebRTC)**
   - Decentralized P2P engine for real-time collaboration.
   - Syncs state changes (like dashboard edits) across multiple clients without a central server.

## Technology Stack

| Domain | Technology |
| :--- | :--- |
| **Framework** | Vue 3, Vite |
| **State** | Pinia |
| **Database/Engine** | DuckDB (WASM) |
| **Visualizations** | Apache ECharts |
| **P2P Sync** | Yjs, y-webrtc |
| **Storage** | localForage (IndexedDB) |
| **Desktop Wrapper** | Electron |
| **Testing** | Vitest, Vue Test Utils |

## Desktop Wrapper (Electron)

When running locally or packaged for desktop, LiteBI is wrapped in Electron. 
- **Renderer Process:** Runs the exact same Vue/Vite build as the web version.
- **Main Process:** Handles native OS interactions (e.g., native file save dialogs, local filesystem access for `.litebi` files) which are restricted in standard web browsers.
