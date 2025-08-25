# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

## Development

Run the dev server:

```
cd web && npm ci && npm run dev
# use alternate port if 5173 is busy
VITE_PORT=5174 npm run dev
```

Open http://127.0.0.1:5173 (or the alternate port) in your browser.

## Tests

```
npm test         # run unit/integration tests
npm run lint     # eslint
npm run build    # type-check + build
```

### Keyboard & Accessibility

- Toggle FPS overlay (dev only): press `F`.
- Overlay search: type to filter, ArrowUp/Down to navigate, Enter to select, Esc to clear.
- Controls have aria-labels; Metrics/Legend uses a tablist; search results are a listbox with options.

### Visualization Features

- Continuous clockwise rotation (adjustable speed); camera focus with adjustable duration.
- Hover tooltips with region name/abbrev, key functions, live activation and blood flow.
- Click or select from Legend/search to pin and focus a region.
- Stimulate pinned region to raise activation for demonstration.
- Legend panel lists regions with color chips; toolbar toggles Metrics/Legend; WS status badge shows Live/Sim.

### Troubleshooting

- If the GLTF model fails to load, a retry toast appears; click “Retry Load”.
- Enable hardware acceleration in your browser for WebGL.
- If WS disconnects, the app automatically retries with exponential backoff; badge will indicate Sim vs Live.

```
