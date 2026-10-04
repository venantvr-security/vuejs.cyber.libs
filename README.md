# vuejs.cyber.visuals

Mutualized visual and accessibility configurations for Cyber & CTI Nexus applications.

## Usage

### 1. Install

```bash
npm install git+https://github.com/venantvr-security/vuejs.cyber.visuals.git
```

### 2. Global Accessibility (Text Size Scaling)

To globally increase the text size and improve readability (increases root `font-size` so all `rem` values in Tailwind scale up proportionally), import the CSS in your main entry file (e.g. `main.js` or `style.css`):

**In `src/main.js`:**
```javascript
import 'vuejs.cyber.visuals/accessibility.css'
```

### 3. Tailwind Preset (Optional)

If you want to share common colors or design tokens, add the preset to your `tailwind.config.js`:

```javascript
import { cyberVisualsPreset } from 'vuejs.cyber.visuals'

export default {
  presets: [cyberVisualsPreset],
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  // ...
}
```
