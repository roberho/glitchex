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
        result = await handleEffect(payload.effectType, payload.intensity);
        break;

      case 'reset':
        prisma.reset();
        result = {
          success: true,
          dataUrl: await prisma.getResult(),
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
  const { arrayBuffer, mimeType } = payload;

  // Validate MIME type
  const validMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  if (!validMimes.includes(mimeType)) {
    throw new Error(`Invalid image type: ${mimeType}`);
  }

  const blob = new Blob([arrayBuffer], { type: mimeType });
  const bitmap = await createImageBitmap(blob);

  // Redraw decoded image to sanitize metadata
  prisma.canvas.width = bitmap.width;
  prisma.canvas.height = bitmap.height;
  prisma.width = bitmap.width;
  prisma.height = bitmap.height;

  const ctx = prisma.ctx;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, prisma.width, prisma.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  prisma.originalImageData = ctx.getImageData(
    0,
    0,
    prisma.width,
    prisma.height
  );
  prisma.imageData = ctx.getImageData(0, 0, prisma.width, prisma.height);

  return {
    success: true,
    dataUrl: await prisma.getResult(),
    dimensions: prisma.getDimensions(),
  };
}

/**
 * Handle effect application
 */
async function handleEffect(effectType, intensity) {
  let dataUrl;

  switch (effectType.toLowerCase()) {
    case 'bw':
    case 'blackandwhite':
      prisma.applyBlackAndWhite();
      dataUrl = await prisma.getResult();
      break;

    case 'sepia':
      prisma.applySepia();
      dataUrl = await prisma.getResult();
      break;

    case 'glitch':
      prisma.applyGlitch(intensity || 5);
      dataUrl = await prisma.getResult();
      break;

    case 'cctv':
      prisma.applyCCTV(intensity || 0.3);
      dataUrl = await prisma.getResult();
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
