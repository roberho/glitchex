/**
 * Glitchex Web Worker
 * Handles all image processing operations on a background thread
 * Messages to/from main thread in JSON format
 */

importScripts('prismatjs.js');

let prisma = new PrismatJS();

/**
 * Message handler - processes commands from main thread
 */
self.onmessage = async (event) => {
  const { command, payload, id } = event.data;

  try {
    let result;

    switch (command) {
      case 'sanitize':
        // Note: File objects can't be passed directly, so we receive ArrayBuffer
        result = await handleSanitize(payload);
        break;

      case 'effect':
        result = handleEffect(payload.effectType, payload.intensity);
        break;

      case 'reset':
        prisma.reset();
        result = {
          success: true,
          dataUrl: prisma.getResult(),
          dimensions: prisma.getDimensions(),
        };
        break;

      case 'getDimensions':
        result = prisma.getDimensions();
        break;

      default:
        throw new Error(`Unknown command: ${command}`);
    }

    // Send result back to main thread
    self.postMessage({
      id,
      success: true,
      result,
    });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error.message,
    });
  }
};

/**
 * Handle image sanitization
 * Creates a temporary image from ArrayBuffer data
 */
async function handleSanitize(payload) {
  return new Promise((resolve, reject) => {
    const { arrayBuffer, mimeType } = payload;

    // Validate MIME type
    const validMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!validMimes.includes(mimeType)) {
      reject(new Error(`Invalid image type: ${mimeType}`));
      return;
    }

    const blob = new Blob([arrayBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      // Redraw to sanitize
      prisma.canvas.width = img.width;
      prisma.canvas.height = img.height;
      prisma.width = img.width;
      prisma.height = img.height;

      const ctx = prisma.ctx;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, prisma.width, prisma.height);
      ctx.drawImage(img, 0, 0);

      prisma.originalImageData = ctx.getImageData(
        0,
        0,
        prisma.width,
        prisma.height
      );
      prisma.imageData = ctx.getImageData(0, 0, prisma.width, prisma.height);

      URL.revokeObjectURL(url);

      resolve({
        success: true,
        dataUrl: prisma.getResult(),
        dimensions: prisma.getDimensions(),
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Handle effect application
 */
function handleEffect(effectType, intensity) {
  let dataUrl;

  switch (effectType.toLowerCase()) {
    case 'bw':
    case 'blackandwhite':
      dataUrl = prisma.applyBlackAndWhite();
      break;

    case 'sepia':
      dataUrl = prisma.applySepia();
      break;

    case 'glitch':
      dataUrl = prisma.applyGlitch(intensity || 5);
      break;

    case 'cctv':
      dataUrl = prisma.applyCCTV(intensity || 0.3);
      break;

    default:
      throw new Error(`Unknown effect: ${effectType}`);
  }

  return {
    success: true,
    effectType,
    dataUrl,
    dimensions: prisma.getDimensions(),
  };
}
