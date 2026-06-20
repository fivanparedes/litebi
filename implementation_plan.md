# LiteBI — Comprehensive Overhaul Plan

After a thorough analysis of the entire codebase (~60 source files, 17 test files, backend, Electron shell), this plan addresses all 7 requested improvement areas organized into actionable phases.

---

## Executive Summary of Findings

| Area | Status | Severity |
|------|--------|----------|
| **Data Source Integrations** | 3 of 6 connectors are mocked, backend has missing dependency | 🔴 High |
| **Stub UI Controls** | 12 non-functional buttons/controls found across 7 files | 🟡 Medium |
| **Bugs & Robustness** | 2 crash-level bugs, 4 memory leaks, security gaps | 🔴 High |
| **Deprecated/Dead Code** | 5 dead imports, 2 unused data structures, 1 orphaned component | 🟢 Low |
| **Test Coverage** | ~15-20% estimated. 15 critical modules with zero tests | 🔴 High |
| **Functionality Validation** | Most features work; key gaps in cross-filtering, permissions, choropleth | 🟡 Medium |
| **Optimization** | Pyodide eager-loaded (40MB), tight store coupling, duplicate patterns | 🟡 Medium |

---

## Proposed Changes

### Phase 1 — Critical Bug Fixes & Crash Prevention

> [!CAUTION]
> These are runtime errors that will crash the app under normal usage. They should be fixed immediately.

#### [MODIFY] [dataStore.js](file:///home/iparedes/litebi/src/stores/dataStore.js)
- **Line 248**: `cleanedData.length` → `targetData.length` — `appendData()` references an undefined variable and throws `ReferenceError` on every call.

#### [MODIFY] [Serializer.js](file:///home/iparedes/litebi/src/modules/project/Serializer.js)
- **Line 317**: `rollbackError` → `fallbackError` — Rollback error catch block references wrong variable name, which swallows the real error and throws a new one.

#### [MODIFY] Backend [package.json](file:///home/iparedes/litebi/backend/package.json)
- Add missing `uuid` dependency — `server.js` imports it but it's not in `package.json`. The backend crashes on startup.
- Fix `main` field: `index.js` → `server.js`.
- Add a `"start": "node server.js"` script.

#### [MODIFY] [projectStore.js](file:///home/iparedes/litebi/src/stores/projectStore.js)
- **Lines 54-58**: Fix double autosave race — `markDirty()` triggers both `triggerAutoSave()` (2s) and `debouncedAutoSave()` (5s) which both invoke autosave, creating potential race conditions and double writes.
- **Line 187**: Remove redundant `const uiStore = useUiStore()` re-declaration that shadows the outer-scope one.

---

### Phase 2 — Stub UI: Wire Up Non-Functional Controls

> [!IMPORTANT]
> These are buttons/inputs visible to users that do nothing when clicked, undermining trust in the product.

#### [MODIFY] [HomeView.vue](file:///home/iparedes/litebi/src/views/HomeView.vue)
- **"Refresh All" button (line ~90)**: Wire `@click` handler to iterate all datasets with `scheduleRefresh` configuration and trigger a manual refresh cycle.
- **"Last Refresh" stat (line ~71)**: Pull from actual dataset metadata timestamps instead of showing `--`.
- **"Failed Syncs" stat (line ~74)**: Track real sync failure count in `dataStore` instead of hardcoded `0`.

#### [MODIFY] [AppHeader.vue](file:///home/iparedes/litebi/src/components/layout/AppHeader.vue)
- **Search bar (line ~351)**: Add `v-model`, implement a global search/command palette that filters datasets, formulas, dashboard tabs, and navigation items.
- **User avatar (line ~404)**: Connect to a simple profile dropdown or remove entirely. Replace hardcoded "JM" with user's initials from settings.

#### [MODIFY] [CleaningView.vue](file:///home/iparedes/litebi/src/views/CleaningView.vue)
- **Validation status (line ~532)**: Implement actual validation by running the transform step against a sample and checking for errors/warnings.
- **Estimated Cost (line ~537)**: Calculate approximate execution time based on dataset row count and transform complexity.

#### [MODIFY] [WidgetConfigurator.vue](file:///home/iparedes/litebi/src/modules/visualization/WidgetConfigurator.vue)
- **Drill-Through (line ~611)**: Either implement drill-through navigation to real dashboard tabs, or remove the panel from the UI. Placeholder page IDs (`customer_detail`, `product_detail`) mislead users.
- **Bookmark Group (line ~654)**: Remove unless a bookmark system is planned.
- **Aggregation Mode (line ~678)**: Either implement Direct Query mode in ChartRenderer or remove the option.
- **Permissions panel (line ~733)**: Either implement real per-widget visibility/export controls or remove the section.
- **Palette swatches (line ~514)**: Make color previews reactive to the selected palette dropdown.

#### [MODIFY] [DatasetList.vue](file:///home/iparedes/litebi/src/modules/data/DatasetList.vue)
- **Fake "ERROR" badge (line ~162)**: Remove the hardcoded CRM-name check. Replace with real error tracking from failed refresh cycles.
- **"Owner" field (line ~179)**: Either implement a simple ownership system or remove the field.

---

### Phase 3 — Data Source Integrations: Complete the Connectors

> [!IMPORTANT]
> 3 of 6 external connectors return fake/mocked data. Users who configure these will see random data instead of their real data.

#### [MODIFY] [LiveConnector.js](file:///home/iparedes/litebi/src/modules/data/LiveConnector.js)
- **SQL Server**: Add `tedious` or `mssql` to the backend and route SQL Server connections through the backend proxy (same pattern as PostgreSQL/MySQL).
- **Salesforce**: Either implement real OAuth 2.0 flow + REST API, or clearly mark as "Coming Soon" in the UI and disable the connector card.
- **Google Analytics**: Either implement real Google Analytics Data API v1 with OAuth, or clearly mark as "Coming Soon" in the UI.
- **Remove the artificial 1200ms delay** (line 21) that slows down even real API calls.
- **Remove `_mockSqlResponse()` and `_mockApiResponse()`** methods once real implementations are in place (or connectors are disabled).

#### [MODIFY] [server.js](file:///home/iparedes/litebi/backend/server.js)
- Add SQL Server support via `mssql` npm package.
- Add basic authentication (at minimum, a shared API key via environment variable).
- Add input validation and query sanitization.
- Add proper error responses with specific error codes for connection failures vs. query errors.

#### [MODIFY] [LiveConnectorModal.vue](file:///home/iparedes/litebi/src/modules/data/LiveConnectorModal.vue)
- **Line 96**: Fix toast message for File imports — `resultData.length` is undefined for File objects.
- Remove dead imports: `Database`, `Link` from `@lucide/vue`.

#### [MODIFY] [MapRenderer.vue](file:///home/iparedes/litebi/src/modules/visualization/MapRenderer.vue)
- **Choropleth mode (line ~188)**: Implement actual choropleth rendering using MapLibre + GeoJSON, or disable the mode option in the widget configurator.

---

### Phase 4 — Test Coverage Expansion

> [!WARNING]
> Estimated coverage is ~15-20%. The 3 largest files (114KB combined) have zero tests. The project has strong testing patterns already — it's a coverage gap, not a quality problem.

#### P0 — Critical Module Tests (Zero tests, high business impact)

##### [NEW] `tests/modules/SqlWorkerClient.spec.js`
- Test DuckDB initialization, query execution, query caching (TTL, LRU eviction), parameter injection, `bigint` conversion, file ingestion (CSV/Parquet), ETL pipeline (all 14 transform types), `exportDb`/`importDb` round-trip.

##### [NEW] `tests/modules/Serializer.spec.js`
- Test round-trip serialization/deserialization, schema validation (Zod), migration logic, rollback on corrupted projects, version compatibility.

##### [NEW] `tests/modules/TransformPipeline.spec.js`
- Test all 14 transformation types individually and in pipeline combinations. Test error handling for invalid transforms.

##### [NEW] `tests/modules/ChartStrategies.spec.js`
- Test each chart type strategy (bar, line, pie, scatter, funnel, gauge, boxplot, combo, etc.) produces valid ECharts options. Test edge cases (empty data, single point, null values).

#### P1 — High Priority Tests

##### [NEW] `tests/modules/LiveConnector.spec.js`
- Test API connector with fetch mocks (success, 404, 401, CORS, non-JSON). Test SQL connector with backend mock. Test error message formatting.

##### [NEW] `tests/stores/collaborationStore.spec.js`
- Test connect/disconnect lifecycle, Yjs doc creation, awareness updates.

##### [NEW] `tests/stores/reportStore.spec.js`
- Test page CRUD, widget placement, page ordering.

##### [NEW] `tests/modules/forecasting.spec.js`
- Test regression and forecasting calculations with known datasets.

##### [NEW] `tests/modules/PythonClient.spec.js`
- Test worker communication, timeout handling, result parsing.

##### [NEW] `tests/modules/HistoryManager.spec.js`
- Test undo/redo stack with push, undo, redo, max size enforcement, clear.

##### [NEW] `tests/components/ErrorBoundary.spec.js`
- Test error capture, fallback UI rendering, error reporting.

#### P2 — Integration & E2E-style Tests

##### [NEW] `tests/integration/data-to-chart.spec.js`
- Test full flow: import CSV → create DuckDB table → create widget → generate chart options.

##### [NEW] `tests/integration/cross-filtering.spec.js`
- Test: click on chart → global filter applied → other widgets re-query → verify filtered results.

##### [NEW] `tests/integration/project-roundtrip.spec.js`
- Test: create project → add data → add widgets → serialize → deserialize → verify equality.

---

### Phase 5 — Dead Code Cleanup & Code Quality

#### [MODIFY] [FormulasView.vue](file:///home/iparedes/litebi/src/views/FormulasView.vue)
- **Lines 75-90**: Remove dead `modeOptions` and `typeOptions` arrays that are never used (template uses inline `<option>` elements).

#### [DELETE] or [MODIFY] [ColumnList.vue](file:///home/iparedes/litebi/src/modules/formulas/ColumnList.vue)
- This component is imported in `FormulasView.vue` but **never mounted** in the template. The view uses its own inline field browser. Either integrate it properly or remove it.

#### [MODIFY] [PythonConnectorModal.vue](file:///home/iparedes/litebi/src/modules/data/PythonConnectorModal.vue)
- Remove dead import: `Terminal` from `@lucide/vue`.

#### [MODIFY] [uiStore.js](file:///home/iparedes/litebi/src/stores/uiStore.js)
- **Line 2**: Remove unused `computed` import from Vue.

#### [MODIFY] [settingsStore.js](file:///home/iparedes/litebi/src/stores/settingsStore.js)
- **Line 115**: Remove dead `document.documentElement.style.zoom = ''` — this CSS property is never set elsewhere.
- **Lines 15-69**: Extract hardcoded palette data (9 palettes × 8 colors) to a separate `config/palettes.js` file.

#### [MODIFY] [Logger.js](file:///home/iparedes/litebi/src/utils/Logger.js)
- **Lines 91, 113**: Replace `alert()` calls with the toast notification system (`useUiStore().addToast()`).

#### [MODIFY] [SqlEngine.js](file:///home/iparedes/litebi/src/modules/formulas/SqlEngine.js)
- **Lines 64-68**: Remove redundant `if (mode === 'metrica')` branch — both branches generate identical SQL.

#### Codebase-wide: Replace ~55 direct `console.*` calls with Logger
- `dataStore.js` (2 calls), `projectStore.js` (1 call), `Serializer.js`, `TransformPipeline.js`, and ~40 `console.error` + ~11 `console.warn` across various components. Use `Logger.error()`, `Logger.warn()`, `Logger.info()` instead.

#### [MODIFY] [reportStore.js](file:///home/iparedes/litebi/src/stores/reportStore.js)
- **Lines 12, 29**: Replace `Date.now()` IDs with `generateId()` for consistency and collision safety.

#### [MODIFY] [formulaStore.js](file:///home/iparedes/litebi/src/stores/formulaStore.js)
- **Line 179**: Replace `Date.now()` with `generateId()`.

---

### Phase 6 — Optimization & Decoupling

#### Lazy-load Pyodide (~40MB)
##### [MODIFY] [PythonClient.js](file:///home/iparedes/litebi/src/modules/python/PythonClient.js)
- Currently the Python Web Worker is instantiated at module level (singleton), which starts downloading ~40MB of Pyodide WASM on app startup even if the user never uses Python features.
- **Change**: Defer worker creation until the first call to `runPython()`. Add a loading indicator.

#### Decouple Dashboard from Collaboration
##### [MODIFY] [dashboardStore.js](file:///home/iparedes/litebi/src/stores/dashboardStore.js)
- **Lines 215-219**: `initCollaborationSync()` is called unconditionally at store creation, tightly coupling dashboard to WebRTC/Yjs. Make it opt-in, triggered only when the user explicitly starts a collaboration session.
- **Lines 183-211**: Yjs observers are never cleaned up on disconnect — add proper unsubscription.

#### Fix Store Coupling
##### [MODIFY] [formulaStore.js](file:///home/iparedes/litebi/src/stores/formulaStore.js)
- **Lines 94-107**: Directly mutates `dataStore.datasets.get(name).schema`, bypassing watchers. Create and use a dedicated `dataStore.updateSchema(name, newSchema)` action.

##### [MODIFY] [projectStore.js](file:///home/iparedes/litebi/src/stores/projectStore.js)
- Directly mutates `dashboardStore.tabs`, `dashboardStore.layouts`, `reportStore.pages`. Route through store actions for proper reactivity.

#### Memory Leak Fixes
##### [MODIFY] [dataStore.js](file:///home/iparedes/litebi/src/stores/dataStore.js)
- `setInterval` timers for scheduled refreshes are never globally cleaned up on store disposal. Add a `$dispose` handler or `clearAllTimers()` action.

##### [MODIFY] [collaborationStore.js](file:///home/iparedes/litebi/src/stores/collaborationStore.js)
- Yjs `ydoc` created at module level is never destroyed on app shutdown. Add proper cleanup.

#### Split Large Files
##### [MODIFY] [ChartStrategies.js](file:///home/iparedes/litebi/src/modules/visualization/ChartStrategies.js)
- This 720-line file defines strategies for ~15 chart types. Split into individual files under `strategies/` directory (e.g., `strategies/pie.js`, `strategies/scatter.js`, `strategies/bar.js`).

#### Reduce Duplicate Code in dataStore
##### [MODIFY] [dataStore.js](file:///home/iparedes/litebi/src/stores/dataStore.js)
- Extract duplicated "array from object" logic (lines 70-78, 36-39) into a utility function.
- Extract duplicated dataset metadata creation (lines 91-103, 146-158, 194-206) into a factory function.

#### History Manager Optimization
##### [MODIFY] [HistoryManager.js](file:///home/iparedes/litebi/src/modules/project/HistoryManager.js)
- Currently stores 20 full project snapshots as compressed strings. Consider structural diffing for large projects to reduce memory footprint.

---

### Phase 7 — Security Hardening

#### [MODIFY] [server.js](file:///home/iparedes/litebi/backend/server.js)
- Add API key authentication via environment variable.
- Add rate limiting middleware.
- Add SQL query validation (block DDL statements like `DROP`, `CREATE`, `ALTER`).
- Log all queries for audit trail.

#### [MODIFY] [electron/main.js](file:///home/iparedes/litebi/electron/main.js)
- **Lines 56-65**: Tighten CSP in production builds — remove `unsafe-eval` and restrict `unsafe-inline` where possible.

#### [MODIFY] [dataStore.js](file:///home/iparedes/litebi/src/stores/dataStore.js)
- **Lines 47, 87, 295**: Sanitize dataset names in SQL template literals. While `safeName` sanitizes at creation time, query functions accept any string parameter.

---

## Verification Plan

### Automated Tests
```bash
# Run full test suite with coverage after each phase
npm run test:coverage

# Verify no regressions
npm run lint
npm run build
```

### Manual Verification
- Phase 1: Verify `appendData()`, project save/load, and backend startup work without crashes.
- Phase 2: Click every previously-stub button and verify a visible, meaningful result.
- Phase 3: Test PostgreSQL, MySQL, and SQL Server connections with real databases. Verify mock connectors are either real or disabled.
- Phase 4: Verify coverage report reaches ≥60% lines.
- Phase 5: Verify no unused imports in IDE, build size hasn't increased.
- Phase 6: Measure initial page load time (Pyodide should not load). Profile dashboard rendering with 50+ widgets.
- Phase 7: Attempt SQL injection via dataset names and connector fields.

---

## Open Questions

> [!IMPORTANT]
> **Mocked Connectors Decision**: For SQL Server, Salesforce, and Google Analytics — should we implement real connectors or disable them with "Coming Soon" badges? Real implementations require:
> - **SQL Server**: `mssql` npm package in backend (~straightforward)
> - **Salesforce**: OAuth 2.0 flow + REST API (significant effort)
> - **Google Analytics**: Google OAuth + GA4 Data API (significant effort)

> [!IMPORTANT]
> **Orphaned `ColumnList.vue`**: This component exists in `/src/modules/formulas/` but is imported and never used. Should it replace the inline field browser in `FormulasView.vue`, or be deleted?

> [!IMPORTANT]
> **Choropleth Map**: `MapRenderer.vue` has a stub for choropleth mode that only logs a warning. Should we implement it with GeoJSON support or remove the option from the UI?

> [!IMPORTANT]
> **Search/Command Palette**: The `AppHeader.vue` search bar is non-functional. Should it become a full command palette (like VS Code's Ctrl+K) or just a simple dataset/tab search?
