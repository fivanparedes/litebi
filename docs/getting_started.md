# Getting Started with LiteBI Development

Welcome to the LiteBI project! This guide will help you set up your local environment and understand the basic workflow for contributing to the application.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**
- A code editor (VS Code is highly recommended with Vue/Volar extensions)

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd litebi
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Running the Application

LiteBI can be run in two modes: as a web application in your browser, or as a desktop application using Electron.

### 1. Web Mode (Browser)

To start the Vite development server for the web interface:

```bash
npm run dev
```

This will launch the app at `http://localhost:5173`. Any changes to the Vue components will be hot-reloaded automatically.

### 2. Desktop Mode (Electron)

To test the application within the Electron environment (which provides access to native desktop APIs):

```bash
npm run electron:dev
```

This command starts the Vite server and then launches the Electron wrapper.

## Building for Production

### Web Build
To compile the static web version (for deploying to a web server or static host):

```bash
npm run build
```
The output will be placed in the `dist/` directory.

### Desktop Build
To package the application as a standalone executable for your operating system:

```bash
npm run electron:build
```
The compiled executables will be available in the `dist-electron/` directory.

## Project Structure Overview

- `src/`: Contains all the Vue frontend code, Pinia stores, and DuckDB logic.
- `electron/`: Contains the main process code for the Electron desktop wrapper.
- `backend/`: (If applicable) Any minimal Node.js backend scripts.
- `docs/`: You are here! Development documentation.
- `tests/`: Vitest and Vue Test Utils test suites.

## Next Steps

- Read the [Architecture Overview](./architecture/architecture_overview.md) to understand how the moving parts (DuckDB, Yjs, Pinia) interact.
- Check the [Development Guidelines](./guidelines/development_guidelines.md) for coding standards and commit conventions.
