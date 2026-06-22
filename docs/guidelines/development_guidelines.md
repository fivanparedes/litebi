# Development Guidelines

Consistency is key to maintaining a healthy codebase. Please adhere to the following guidelines when contributing to LiteBI.

## Code Formatting and Linting

We enforce strict formatting rules to prevent "style arguments" during code reviews.

- **Prettier:** Used for all code formatting (spacing, quotes, line length).
- **ESLint:** Used for catching programmatic errors and enforcing Vue best practices.

**Before committing, ensure your code passes linting:**
```bash
npm run lint
```
*Tip: Configure your IDE to run Prettier and ESLint on save.*

## Git Workflow

We follow a standard Feature Branch workflow.

1. **Branch Naming:**
   - Features: `feature/short-description` (e.g., `feature/add-pie-chart`)
   - Bugfixes: `fix/issue-description` (e.g., `fix/csv-parsing-error`)
   - Docs: `docs/update-readme`

2. **Commit Messages:**
   Use conventional commits format:
   - `feat: add new date picker component`
   - `fix: resolve crash on null values`
   - `refactor: simplify store logic`
   - `docs: update setup guide`

## Vue.js Conventions

- **Composition API:** We strictly use Vue 3's `<script setup>` syntax. Do not use the Options API (`export default { data() ... }`).
- **Reactivity:** 
  - Use `ref()` for primitive values (strings, numbers, booleans).
  - Use `reactive()` for grouping related objects, but be cautious of losing reactivity on destructuring.
- **Component Naming:** 
  - Multi-word component names (e.g., `DataViewer.vue`, not `Viewer.vue`).
  - Base components (buttons, inputs) should start with `Base` (e.g., `BaseInput.vue`).

## CSS and Styling

- **Vanilla CSS / Custom Properties:** We rely heavily on native CSS variables defined in `index.css` for theming (Dark/Light mode).
- **TailwindCSS:** Tailwind is available via `@tailwindcss/vite`. Use Tailwind utility classes for layout, spacing, and typography within components. Avoid writing custom CSS in `<style>` blocks unless absolutely necessary for complex animations or overrides that Tailwind cannot handle cleanly.

## State Management

- Avoid using Vue's Provide/Inject for global state. Use Pinia stores instead.
- Keep Pinia actions focused. If an action is doing too much data transformation, move that logic to a utility function in `src/utils/`.
