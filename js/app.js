/**
 * Glitchex Application Controller
 * Manages UI interactions, dual-canvas system, and Web Worker communication
 */

class GlitchexApp {
  constructor() {
    // Dual-canvas system
    this.baseCanvas = document.getElementById('baseCanvas');
    this.overlayCanvas = document.getElementById('overlayCanvas');
    this.baseCtx = this.baseCanvas.getContext('2d');
    this.overlayCtx = this.overlayCanvas.getContext('2d');

    // UI Elements
    this.fileInput = document.getElementById('fileInput');
    this.uploadBtn = document.getElementById('uploadBtn');
    this.effectBtns = document.querySelectorAll('.effect-btn');
    this.intensitySlider = document.getElementById('intensitySlider');
    this.intensityValue = document.getElementById('intensityValue');
    this.resetBtn = document.getElementById('resetBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.statusText = document.getElementById('statusText');

    // WebWorker communication
    this.worker = new Worker('js/worker.js');
    this.workerMessageId = 0;
    this.pendingRequests = new Map();

    // State
    this.isProcessing = false;
    this.currentImageLoaded = false;
    this.lastEffect = null;

    this._initWorkerListener();
    this._initEventListeners();
  }

  /**
   * Initialize Web Worker message listener
   */
  _initWorkerListener() {
    this.worker.onmessage = (event) => {
      const { id, success, result, error } = event.data;
      const callback = this.pendingRequests.get(id);

      if (callback) {
        if (success) {
          callback.resolve(result);
        } else {
          callback.reject(new Error(error));
        }
        this.pendingRequests.delete(id);
      }
    };

    this.worker.onerror = (error) => {
      console.error('Worker error:', error);
      this._setStatus('Error in processing', 'error');
      this.isProcessing = false;
    };
  }

  /**
   * Initialize UI event listeners
   */
  _initEventListeners() {
    this.uploadBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this._handleImageUpload(e));

    this.effectBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => this._applyEffect(e.target.dataset.effect));
    });

    this.intensitySlider.addEventListener('input', (e) => {
      this.intensityValue.textContent = e.target.value;
    });

    this.resetBtn.addEventListener('click', () => this._resetImage());
    this.downloadBtn.addEventListener('click', () => this._downloadImage());
  }

  /**
   * Handle image file upload and sanitization
   */
  async _handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    this.isProcessing = true;
    this._setStatus('Sanitizing and loading image...', 'processing');
    this._setUIDisabled(true);

    try {
      const arrayBuffer = await file.arrayBuffer();

      const result = await this._sendWorkerMessage('sanitize', {
        arrayBuffer,
        mimeType: file.type,
      });

      // Draw sanitized image to base canvas
      this._displayImage(result.dataUrl, result.dimensions);
      this.currentImageLoaded = true;

      this._setStatus(`Image loaded: ${result.dimensions.width}×${result.dimensions.height}px`, 'success');
    } catch (error) {
      this._setStatus(`Upload failed: ${error.message}`, 'error');
    } finally {
      this.isProcessing = false;
      this._setUIDisabled(false);
    }
  }

  /**
   * Apply visual effect to image
   */
  async _applyEffect(effectType) {
    if (!this.currentImageLoaded || this.isProcessing) return;

    this.isProcessing = true;
    this._setStatus(`Applying ${effectType} effect...`, 'processing');
    this._setEffectButtonsDisabled(true);

    try {
      const intensity = parseFloat(this.intensitySlider.value);

      const result = await this._sendWorkerMessage('effect', {
        effectType,
        intensity,
      });

      this._displayImage(result.dataUrl, result.dimensions);
      this.lastEffect = effectType;
      this._setStatus(`${effectType} effect applied`, 'success');
    } catch (error) {
      this._setStatus(`Effect failed: ${error.message}`, 'error');
    } finally {
      this.isProcessing = false;
      this._setEffectButtonsDisabled(false);
    }
  }

  /**
   * Reset image to original unprocessed state
   */
  async _resetImage() {
    if (!this.currentImageLoaded || this.isProcessing) return;

    this.isProcessing = true;
    this._setStatus('Resetting image...', 'processing');

    try {
      const result = await this._sendWorkerMessage('reset', {});
      this._displayImage(result.dataUrl, result.dimensions);
      this.lastEffect = null;
      this._setStatus('Image reset to original', 'success');
    } catch (error) {
      this._setStatus(`Reset failed: ${error.message}`, 'error');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Download processed image
   */
  _downloadImage() {
    if (!this.currentImageLoaded) return;

    const link = document.createElement('a');
    link.href = this.baseCanvas.toDataURL('image/jpeg', 0.95);
    link.download = `glitchex-${Date.now()}.jpg`;
    link.click();

    this._setStatus('Image downloaded', 'success');
  }

  /**
   * Display image on base canvas
   */
  _displayImage(dataUrl, dimensions) {
    const img = new Image();
    img.onload = () => {
      this.baseCanvas.width = dimensions.width;
      this.baseCanvas.height = dimensions.height;
      this.overlayCanvas.width = dimensions.width;
      this.overlayCanvas.height = dimensions.height;

      this.baseCtx.drawImage(img, 0, 0);
      this._renderLightGlares(); // Apply overlay effects
    };
    img.src = dataUrl;
  }

  /**
   * Render light glares on overlay canvas using screen composite
   */
  _renderLightGlares() {
    const width = this.overlayCanvas.width;
    const height = this.overlayCanvas.height;

    this.overlayCtx.clearRect(0, 0, width, height);
    this.overlayCtx.globalCompositeOperation = 'screen';

    // Create radial gradient glare
    const glareCount = 3;
    for (let i = 0; i < glareCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = 50 + Math.random() * 100;

      const gradient = this.overlayCtx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.overlayCtx.fillStyle = gradient;
      this.overlayCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    // Reset composite
    this.overlayCtx.globalCompositeOperation = 'source-over';
  }

  /**
   * Send message to Web Worker and wait for response
   */
  _sendWorkerMessage(command, payload) {
    return new Promise((resolve, reject) => {
      const id = ++this.workerMessageId;

      this.pendingRequests.set(id, { resolve, reject });
      this.worker.postMessage({ command, payload, id });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Worker timeout for command: ${command}`));
        }
      }, 30000);
    });
  }

  /**
   * Update status text
   */
  _setStatus(message, type = 'info') {
    this.statusText.textContent = message;
    this.statusText.className = `status-text ${type}`;
  }

  /**
   * Disable/enable main controls
   */
  _setUIDisabled(disabled) {
    this.effectBtns.forEach((btn) => (btn.disabled = disabled));
    this.resetBtn.disabled = disabled;
    this.downloadBtn.disabled = disabled;
    this.intensitySlider.disabled = disabled;
  }

  /**
   * Disable/enable effect buttons
   */
  _setEffectButtonsDisabled(disabled) {
    this.effectBtns.forEach((btn) => (btn.disabled = disabled));
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new GlitchexApp();
  console.log('Glitchex loaded and ready');
});
