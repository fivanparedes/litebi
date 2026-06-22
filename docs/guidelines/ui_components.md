# UI Component Library

LiteBI uses a set of foundational UI components to ensure a consistent, premium look and feel across the application. These are located in `src/components/base/`.

## Design Philosophy

- **Consistency:** Always use a `Base` component instead of native HTML elements when applicable (e.g., use `<BaseButton>` instead of `<button>`).
- **Tailwind First:** Components are styled using Tailwind CSS classes, pulling colors from our defined CSS variables for seamless dark/light mode switching.
- **Accessibility:** Ensure ARIA attributes are passed down appropriately.

## Core Components

### `BaseButton`
The primary interaction element.
- **Props:** 
  - `variant` (primary, secondary, danger, ghost)
  - `size` (sm, md, lg)
  - `loading` (boolean, shows spinner)
  - `disabled` (boolean)
- **Usage:** `<BaseButton variant="primary" @click="save">Save Dashboard</BaseButton>`

### `BaseInput`
For single-line text entry.
- **Props:**
  - `modelValue` (v-model binding)
  - `label` (String, displays above input)
  - `error` (String, displays error state and message)
- **Usage:** `<BaseInput v-model="username" label="Username" />`

### `BaseModal`
For dialogs and popups.
- **Props:**
  - `isOpen` (boolean, controls visibility)
  - `title` (String)
- **Slots:** `default` (body), `footer` (action buttons).

### `BaseSelect` / `BaseDropdown`
For selecting from a list of options.

### `BaseCard`
A container with standard padding, borders, and shadows for grouping related content (often used as the wrapper for widgets).

## Icons

We use **Lucide Icons** (`@lucide/vue`). Do not import SVG files directly unless it is a custom logo.
```vue
<script setup>
import { ChartBarIcon, SettingsIcon } from 'lucide-vue-next'
</script>

<template>
  <SettingsIcon class="w-5 h-5 text-gray-500" />
</template>
```

## Adding New Components

If you need a UI element that doesn't exist, first consider if an existing component can be extended. If a new component is needed:
1. Create it in `src/components/base/`.
2. Prefix the name with `Base`.
3. Ensure it relies on Tailwind utility classes.
4. Write a unit test for it in `tests/components/`.
