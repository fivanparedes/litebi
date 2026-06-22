# Class & Module Diagrams

This document illustrates the core logical components of LiteBI and their relationships.

## Core Services & Stores

```mermaid
classDiagram
    class AppStateStore {
        +currentDashboardId: String
        +activeFilters: Object
        +theme: String
        +setTheme(theme)
        +setActiveDashboard(id)
    }

    class DataProjectStore {
        +datasets: Array
        +relationships: Array
        +importData(file)
        +defineRelationship(tableA, tableB)
    }

    class DashboardStore {
        +dashboards: Array
        +widgets: Array
        +addWidget(dashboardId, widgetConfig)
        +updateWidgetData(widgetId, data)
    }

    class DuckDBEngine {
        -worker: Worker
        -connection: Object
        +init()
        +loadCSV(buffer)
        +executeQuery(sql): Promise
        +getTableSchema(tableName)
    }

    class SyncService {
        -yDoc: Y.Doc
        -provider: WebRTCProvider
        +connect(roomId)
        +bindStore(piniaStore)
        +disconnect()
    }

    class ExportManager {
        +exportToPDF(elementId)
        +exportToPPTX(dashboards)
        +exportToPNG(elementId)
    }

    AppStateStore --> DashboardStore : Controls active view
    DataProjectStore --> DuckDBEngine : Sends raw data to
    DashboardStore --> DuckDBEngine : Requests aggregated data from
    SyncService --> AppStateStore : Syncs state across peers
    SyncService --> DashboardStore : Syncs state across peers
    ExportManager --> DashboardStore : Reads dashboard layouts
```

## UI Component Hierarchy (Simplified)

```mermaid
graph TD
    App[App.vue] --> Header[AppHeader.vue]
    App --> MainView[MainView.vue]
    
    MainView --> DataPrep[DataPreparationView.vue]
    MainView --> Modeling[DataModelingView.vue]
    MainView --> Dashboard[DashboardView.vue]

    DataPrep --> DataTable[DataTable.vue]
    DataPrep --> FormulaEditor[FormulaEditor.vue]

    Modeling --> SchemaCanvas[SchemaCanvas.vue]

    Dashboard --> Grid[GridstackCanvas.vue]
    Grid --> Widget[WidgetContainer.vue]
    Widget --> EChart[EChartsWrapper.vue]
    Widget --> Filter[SlicerComponent.vue]
```

> **Note:** These diagrams are intended to provide a high-level mental model of the application. For detailed, up-to-date API signatures, always refer to the source code.
