# Glitchex

A high-performance, browser-based image manipulation suite with real-time visual effects. Built with vanilla JavaScript, HTML5, and CSS3 — no external frameworks. **All processing happens client-side; zero data is sent to any server.**

![Glitchex Dashboard](https://img.shields.io/badge/Status-Production-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue)

## Features

### Visual Effects Library

- **Black & White** — Luminance-based monochrome conversion using the ITU-R BT.601 formula
- **Sepia** — Classic warm tone transformation using color matrix operations
- **Glitch** — Digital artifact simulation with random segment offsets and RGB channel splitting
- **CCTV** — Surveillance aesthetic with dynamic scanlines and grain overlay

### Technical Highlights

- **Web Worker Thread** — Offloads image processing to prevent UI blocking (maintains 60 FPS)
- **Dual-Canvas System** — Separate canvases for base image rendering and overlay effects (light glares)
- **EXIF Sanitization** — Automatically strips all embedded metadata on image upload
- **High-Performance Pixel Processing** — Direct memory access via `getImageData` and `putImageData`
- **Responsive Design** — Mobile-optimized CSS Grid/Flexbox layout
- **GitHub Pages Ready** — Static file structure compatible with GitHub Pages deployment

---

## Architecture

### Project Structure

```
glitchex/
├── index.html                 # Main application container
├── css/
│   └── styles.css            # Responsive styling (Grid/Flexbox)
├── js/
│   ├── prismatjs.js          # Core image processing engine
│   ├── worker.js             # Web Worker for background processing
│   └── app.js                # Application controller & UI logic
└── README.md
```

### Component Overview

#### PrismatJS Engine (`js/prismatjs.js`)

The core image processing class that handles all visual transformations:

```javascript
class PrismatJS {
  // Load image with automatic EXIF stripping
  async sanitizeImage(file) { ... }
  
  // Effect methods using canvas pixel manipulation
  applyBlackAndWhite() { ... }
  applySepia() { ... }
  applyGlitch(intensity) { ... }
  applyCCTV(intensity) { ... }
  
  // Utility methods
  reset() { ... }
  getResult() { ... }
  getDimensions() { ... }
}
```

**Key Features:**
- MIME type validation (JPEG, PNG, WebP, GIF)
- Metadata stripping via fresh canvas redraw
- Direct pixel manipulation using `Uint8ClampedArray`
- Image data caching for efficient resets

#### Web Worker (`js/worker.js`)

Executes image processing asynchronously to maintain responsive UI:

- Imports `PrismatJS` for processing
- Handles message-based RPC protocol
- Supports commands: `sanitize`, `effect`, `reset`, `getDimensions`
- Error handling with proper message routing

**Worker Protocol:**
```javascript
// Main thread → Worker
{
  command: 'effect',
  payload: { effectType: 'glitch', intensity: 7 },
  id: 1
}

// Worker → Main thread
{
  id: 1,
  success: true,
  result: { dataUrl: '...', dimensions: {...} }
}
```

#### Application Controller (`js/app.js`)

Manages UI interactions and orchestrates the dual-canvas system:

```javascript
class GlitchexApp {
  // Dual-canvas rendering
  baseCanvas       // Primary image display
  overlayCanvas    // Light glares & effects overlay
  
  // Core methods
  _handleImageUpload(event)     // File input → Worker
  _applyEffect(effectType)      // Effect button → Worker
  _renderLightGlares()          // Radial gradient screen-mode blending
  _displayImage(url, dimensions) // Update both canvases
}
```

**Features:**
- Promise-based Worker communication with timeout handling
- Status indicator updates (info, success, error, processing)
- Persisten DOM state management
- Graceful error handling

#### User Interface (`index.html` + `css/styles.css`)

**Layout:**
- Header with branding
- Two-column responsive grid (image preview + control panel)
- Mobile-responsive breakpoints (1024px, 768px, 480px)

**Controls:**
- File input with MIME validation
- Effect button grid (2×2 on desktop, 1×4 on mobile)
- Intensity slider with live value feedback
- Reset and Download buttons
- Live status indicator with color-coded states

**Design System:**
- Dark mode with neon accent colors (cyan + magenta)
- CSS variables for theming
- Smooth transitions and hover effects
- Custom scrollbar styling
- Pulsing animation for "processing" state

---

## Usage

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/roberho/glitchex
   cd glitchex
   ```

2. **Start a local web server:**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js
   npx http-server
   
   # Ruby
   ruby -run -ehttpd . -p8000
   ```

3. **Open in browser:**
   ```
   http://localhost:8000
   ```


## Effect Parameters

### Black & White
- **Formula:** Y = 0.299R + 0.587G + 0.114B (ITU-R BT.601)
- **Intensity:** Not used (full conversion)

### Sepia
- **Formula:** Color transformation matrix
  - R' = R × 0.393 + G × 0.769 + B × 0.189
  - G' = R × 0.349 + G × 0.686 + B × 0.168
  - B' = R × 0.272 + G × 0.534 + B × 0.131
- **Intensity:** Not used (fixed tone)

### Glitch
- **Algorithm:** Random horizontal offset per segment with RGB channel randomization
- **Intensity Range:** 1–10 (controls segment count: `segments = intensity × 3`)
- **Offset Range:** ±30% of image width per segment

### CCTV
- **Components:** Horizontal scanlines + dynamic grain overlay
- **Intensity Range:** 0.1–1.0
- **Scanlines:** Every alternating row dimmed by intensity factor
- **Grain:** Random noise per pixel (±30 units × intensity)

---

## Security & Privacy

### No Server Communication
- 100% client-side processing
- No API calls, analytics, or telemetry
- Images never leave your device

### EXIF Metadata Removal
When you upload an image, Glitchex:
1. Validates MIME type (JPEG, PNG, WebP, GIF only)
2. Reads file as ArrayBuffer
3. Creates Image object from buffer
4. **Redraws entire image on a fresh canvas** (strips all metadata)
5. Extracts pixel data for processing

This approach automatically removes:
- GPS coordinates
- Camera model & serial number
- Timestamps
- Thumbnails
- IPTC keywords
- All other EXIF/XMP data

---

## Performance Characteristics

### Web Worker Benefits
- **Main Thread:** Responsive to user interaction (60 FPS)
- **Worker Thread:** Dedicated to image processing
- **Prevents jank** from heavy pixel manipulation
- **Message overhead:** Minimal (<1% of processing time)

### Rendering Pipeline
1. **User clicks effect** → Main thread queues command
2. **Worker processes** → Worker thread runs effect algorithm
3. **Result returns** → Main thread receives data URL
4. **Canvas updates** → Both base and overlay canvases refresh
5. **UI responsive** → Never blocks interaction loop

### Memory Efficiency
- Uses `Uint8ClampedArray` for direct pixel access
- Stores original ImageData for fast reset
- Reuses canvas contexts across effects
- No unnecessary image copies in Web Worker

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome  | 51+     | ✓ Full  |
| Firefox | 44+     | ✓ Full  |
| Safari  | 10+     | ✓ Full  |
| Edge    | 15+     | ✓ Full  |

**Requirements:**
- Canvas API with 2D context
- Web Workers API
- FileReader API
- `getImageData`/`putImageData` support

---

## Development

### Adding New Effects

1. **Add method to `PrismatJS` class:**
   ```javascript
   applyCustomEffect(intensity) {
     this._ensureImageData();
     const data = this.imageData.data;
     
     for (let i = 0; i < data.length; i += 4) {
       // Pixel manipulation...
     }
     
     this.ctx.putImageData(this.imageData, 0, 0);
     return this.canvas.toDataURL();
   }
   ```

2. **Register in Worker handler:**
   ```javascript
   case 'customeffect':
     dataUrl = prisma.applyCustomEffect(intensity);
     break;
   ```

3. **Add UI button:**
   ```html
   <button class="effect-btn" data-effect="customeffect">Custom</button>
   ```

### Modifying the UI

The responsive CSS uses CSS custom properties for easy theming:

```css
:root {
  --primary-bg: #0a0e27;
  --accent-primary: #00d4ff;
  --accent-secondary: #ff006e;
  /* ... */
}
```

Change any color variable to theme the entire application.

---

## Performance Tips

1. **Large Images:** For images >4000px, consider client-side resizing first
2. **Effect Intensity:** Higher intensity = more segments/computation; adjust for fluidity
3. **Multiple Effects:** Each effect resets canvas; chain effects carefully
4. **Mobile:** Lower intensity values for smoother experience on mobile devices

---

## Troubleshooting

### Worker not loading
- Check browser console for CORS errors
- Verify `worker.js` is in `/js/` directory
- Ensure server sends correct content-type headers

### Image not uploading
- Verify file is JPEG, PNG, WebP, or GIF
- Check browser console for security errors
- Try smaller file size first

### Effects not visible
- Ensure image is loaded (canvas placeholder hidden)
- Check intensity slider value (may be too low)
- Verify browser supports Canvas 2D context

---

## License

MIT License — Free for personal and commercial use

---

## Contributing

Contributions welcome! Areas for improvement:
- Additional effects (pixelate, blur, invert, etc.)
- Batch processing for multiple images
- Effect preview presets
- Layer/history system
- Export format options (WebP, PNG)

---

## Credits

**Glitchex** — Created as a high-performance, privacy-first image manipulation suite.

Inspired by vintage digital aesthetics and modern web capabilities.

