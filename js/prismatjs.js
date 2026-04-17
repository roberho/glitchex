/**
 * PrismatJS - Image Manipulation Engine
 * High-performance pixel manipulation with canvas-based effects processing
 * Designed for use with Web Workers for non-blocking UI
 */

class PrismatJS {
  constructor() {
    // Detect if running in Web Worker (no document object)
    const isWorker = typeof document === 'undefined';
    
    if (isWorker) {
      // Use OffscreenCanvas in Web Worker
      this.canvas = new OffscreenCanvas(1, 1);
    } else {
      // Use regular canvas in browser
      this.canvas = document.createElement('canvas');
    }
    
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.imageData = null;
    this.originalImageData = null;
    this.width = 0;
    this.height = 0;
  }

  /**
   * Load and sanitize an image file (strips EXIF metadata)
   * Draws to hidden canvas to remove all embedded data
   * @param {File} file - Image file to load
   * @returns {Promise<ImageData>} Sanitized image data
   */
  async sanitizeImage(file) {
    return new Promise((resolve, reject) => {
      // Validate MIME type
      const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validMimes.includes(file.type)) {
        reject(new Error(`Invalid image type: ${file.type}`));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Draw to fresh canvas to strip EXIF/metadata
          this.canvas.width = img.width;
          this.canvas.height = img.height;
          this.width = img.width;
          this.height = img.height;

          // Clear canvas and redraw (strips all metadata)
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(0, 0, this.width, this.height);
          this.ctx.drawImage(img, 0, 0);

          // Store sanitized image data
          this.originalImageData = this.ctx.getImageData(0, 0, this.width, this.height);
          this.imageData = this.ctx.getImageData(0, 0, this.width, this.height);

          resolve(this.imageData);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Apply Black & White effect using luminance formula
   * Y = 0.299R + 0.587G + 0.114B
   */
  applyBlackAndWhite() {
    this._ensureImageData();
    const data = this.imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      data[i] = luminance;
      data[i + 1] = luminance;
      data[i + 2] = luminance;
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  /**
   * Apply Sepia tone effect
   * Uses standard sepia transformation matrix
   */
  applySepia() {
    this._ensureImageData();
    const data = this.imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
      data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
      data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  /**
   * Apply Glitch effect - random segment offsetting with RGB split
   * @param {number} intensity - Intensity of glitch (1-10)
   */
  applyGlitch(intensity = 5) {
    this._ensureImageData();
    const data = this.imageData.data;
    const segments = Math.floor(intensity * 3);
    const segmentHeight = Math.floor(this.height / segments);

    // Copy original for manipulation
    const originalData = new Uint8ClampedArray(data);

    for (let seg = 0; seg < segments; seg++) {
      const startY = seg * segmentHeight;
      const endY = seg === segments - 1 ? this.height : (seg + 1) * segmentHeight;
      const offsetX = Math.floor((Math.random() - 0.5) * this.width * 0.3);
      const channel = Math.floor(Math.random() * 3); // 0=R, 1=G, 2=B

      for (let y = startY; y < endY; y++) {
        for (let x = 0; x < this.width; x++) {
          const srcX = (x - offsetX + this.width) % this.width;
          const srcIdx = (y * this.width + srcX) * 4;
          const dstIdx = (y * this.width + x) * 4;

          data[dstIdx + channel] = originalData[srcIdx + channel];
        }
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  /**
   * Apply CCTV effect - scanlines + noise overlay
   * @param {number} intensity - Scanline intensity (0.1-1.0)
   */
  applyCCTV(intensity = 0.3) {
    this._ensureImageData();
    const data = this.imageData.data;

    // Add horizontal scanlines
    for (let y = 0; y < this.height; y += 2) {
      const scanlineOpacity = intensity;
      for (let x = 0; x < this.width; x++) {
        const idx = (y * this.width + x) * 4;
        data[idx] *= 1 - scanlineOpacity;
        data[idx + 1] *= 1 - scanlineOpacity;
        data[idx + 2] *= 1 - scanlineOpacity;
      }
    }

    // Add grain/noise
    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 30 * intensity;
      data[i] = Math.min(255, data[i] + noise);
      data[i + 1] = Math.min(255, data[i + 1] + noise);
      data[i + 2] = Math.min(255, data[i + 2] + noise);
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  /**
   * Reset image to original unprocessed state
   */
  reset() {
    if (this.originalImageData) {
      this.imageData = this.ctx.createImageData(this.originalImageData);
      this.imageData.data.set(this.originalImageData.data);
      this.ctx.putImageData(this.imageData, 0, 0);
    }
  }

  /**
   * Get current canvas as image data URL
   * Works with both regular Canvas and OffscreenCanvas
   */
  async getResult() {
    // Check if this is OffscreenCanvas
    if (typeof this.canvas.convertToBlob === 'function') {
      // OffscreenCanvas
      const blob = await this.canvas.convertToBlob({ type: 'image/png' });
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } else {
      // Regular Canvas
      return this.canvas.toDataURL();
    }
  }

  /**
   * Get canvas dimensions
   */
  getDimensions() {
    return { width: this.width, height: this.height };
  }

  /**
   * Internal: Ensure image data is initialized
   */
  _ensureImageData() {
    if (!this.imageData) {
      throw new Error('No image loaded. Call sanitizeImage first.');
    }
  }

  /**
   * Internal: Helper to convert canvas to dataURL for effects
   * Works with both regular Canvas and OffscreenCanvas
   */
  async _canvasToDataURL() {
    return this.getResult();
  }
}

// Export for use in Web Worker or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PrismatJS;
}
