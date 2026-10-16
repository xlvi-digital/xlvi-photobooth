// Canvas renderer to composite captured photo with chosen wedding frame
// and generate Boomerang videos, Multi-Photo collage, and 9:16 Instagram Story video.
import { formatIndonesianDate } from '../components/ScreenLanding.jsx';
import { getFilterById } from './photoFilters.js';

/**
 * Preload helper to ensure an image source is fully loaded before drawing
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error('Image source is empty'));
    if (src instanceof HTMLCanvasElement || src instanceof Image) {
      if (src instanceof Image && !src.complete) {
        src.onload = () => resolve(src);
        src.onerror = (e) => reject(e);
        return;
      }
      return resolve(src);
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      console.error('Frame image failed to load:', src, err);
      reject(err);
    };
    img.src = src;
  });
}

/**
 * Unified drawer for photobooth frame decor and typography onto any 2D canvas context.
 */
export function drawPhotoboothFrameToCanvas(ctx, width, height, img, frameId, isMirrored = false, currentEvent = null, filterId = 'original') {
  const activeId = typeof frameId === 'object' ? frameId?.id : (frameId || 'frame-01');
  const filterPreset = getFilterById(filterId);

  // Dynamic event text values strictly from currentEvent
  const eventName = currentEvent?.name || '';
  const rawDate = currentEvent?.event_date || '';
  const formattedIndoDate = formatIndonesianDate(rawDate);

  // Temporary debugging console log as strictly requested by user:
  console.log('[FRAME EVENT] currentEvent.name', currentEvent?.name);
  console.log('[FRAME EVENT] currentEvent.event_date', currentEvent?.event_date);

  // 1. Warm luxury ivory/cream background
  ctx.fillStyle = '#faf7f2';
  ctx.fillRect(0, 0, width, height);

  // 2. Photo Area (Inset with padding)
  const photoInsetX = Math.round(width * 0.066);
  const photoInsetY = Math.round(height * 0.05);
  const photoWidth = width - (photoInsetX * 2);
  const photoHeight = height - Math.round(height * 0.2); // leave bottom zone for wedding typography

  if (img) {
    ctx.save();
    const radius = Math.round(width * 0.016);
    ctx.beginPath();
    ctx.moveTo(photoInsetX + radius, photoInsetY);
    ctx.lineTo(photoInsetX + photoWidth - radius, photoInsetY);
    ctx.quadraticCurveTo(photoInsetX + photoWidth, photoInsetY, photoInsetX + photoWidth, photoInsetY + radius);
    ctx.lineTo(photoInsetX + photoWidth, photoInsetY + photoHeight - radius);
    ctx.quadraticCurveTo(photoInsetX + photoWidth, photoInsetY, photoInsetX + photoWidth, photoInsetY + photoHeight);
    ctx.lineTo(photoInsetX + radius, photoInsetY + photoHeight);
    ctx.quadraticCurveTo(photoInsetX, photoInsetY + photoHeight, photoInsetX, photoInsetY + photoHeight - radius);
    ctx.lineTo(photoInsetX, photoInsetY + radius);
    ctx.quadraticCurveTo(photoInsetX, photoInsetY, photoInsetX + radius, photoInsetY);
    ctx.closePath();
    ctx.clip();

    // Apply photo filter strictly to user photo (frame decor is unaffected)
    if (filterPreset && filterPreset.canvasFilter && filterPreset.canvasFilter !== 'none') {
      try {
        ctx.filter = filterPreset.canvasFilter;
      } catch (e) {
        console.warn('Canvas filter apply warning:', e);
      }
    }

    // Keep the complete photo visible inside the frame's photo area.
    const imgW = img.videoWidth || img.naturalWidth || img.width || 1;
    const imgH = img.videoHeight || img.naturalHeight || img.height || 1;
    const imgAspect = imgW / imgH;
    const targetAspect = photoWidth / photoHeight;
    const scale = Math.min(photoWidth / imgW, photoHeight / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = photoInsetX + ((photoWidth - drawW) / 2);
    const drawY = photoInsetY + ((photoHeight - drawH) / 2);

    if (isMirrored) {
      ctx.save();
      ctx.translate(photoInsetX + photoWidth, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }
    ctx.restore();
  }

  // 3. Frame Decor based on activeId
  if (activeId === 'frame-02') {
    // Botanical Romance
    ctx.strokeStyle = '#718066';
    ctx.lineWidth = Math.max(2, Math.round(width * 0.003));
    ctx.strokeRect(40, 40, width - 80, height - 80);

    ctx.strokeStyle = '#d7cbbd';
    ctx.lineWidth = 1;
    ctx.strokeRect(52, 52, width - 104, height - 104);

    ctx.fillStyle = '#718066';
    ctx.font = `${Math.round(width * 0.026)}px serif`;
    ctx.fillText('🌿', 65, 95);
    ctx.fillText('🌿', width - 105, 95);

  } else if (activeId === 'frame-03') {
    // Luxury Warm Brown
    ctx.strokeStyle = '#5c4033';
    ctx.lineWidth = Math.max(3, Math.round(width * 0.0055));
    ctx.strokeRect(30, 30, width - 60, height - 60);

    ctx.strokeStyle = '#bfa588';
    ctx.lineWidth = 2;
    ctx.strokeRect(46, 46, width - 92, height - 92);

    const corners = [
      [42, 42],
      [width - 54, 42],
      [42, height - 54],
      [width - 54, height - 54]
    ];
    ctx.fillStyle = '#5c4033';
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx, cy, 12, 12);
    });

  } else if (activeId === 'frame-05') {
    // Modern Editorial
    ctx.strokeStyle = '#2d2926';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 36, width - 72, height - 72);

    ctx.strokeStyle = '#8c7365';
    ctx.lineWidth = 1;
    ctx.strokeRect(42, 42, width - 84, height - 84);

  } else {
    // Default: Minimal Elegant (frame-01 or fallback)
    ctx.strokeStyle = '#c8a882';
    ctx.lineWidth = Math.max(2, Math.round(width * 0.003));
    ctx.strokeRect(36, 36, width - 72, height - 72);

    ctx.strokeStyle = '#5c4033';
    ctx.lineWidth = 1;
    ctx.strokeRect(46, 46, width - 92, height - 92);

    ctx.strokeStyle = '#c8a882';
    ctx.lineWidth = 2;
    ctx.strokeRect(photoInsetX, photoInsetY, photoWidth, photoHeight);
  }

  // 4. Wedding Typography at bottom zone
  const textCenterY = height - Math.round(height * 0.1);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8c7365';
  ctx.font = `500 ${Math.round(width * 0.018)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText('THE WEDDING OF', width / 2, textCenterY - 45);

  if (eventName) {
    ctx.fillStyle = '#3a2820';
    ctx.font = `600 ${Math.round(width * 0.052)}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillText(eventName, width / 2, textCenterY + 15);
  }

  if (formattedIndoDate) {
    ctx.fillStyle = '#7a6052';
    ctx.font = `400 ${Math.round(width * 0.02)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(formattedIndoDate, width / 2, textCenterY + 58);
  }

  ctx.fillStyle = '#b3a093';
  ctx.font = `400 ${Math.round(width * 0.014)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText('XLVI VIRTUAL PHOTOBOOTH', width / 2, height - 55);
}

/**
 * Composites the raw single photo with the chosen wedding frame overlay and typography.
 * Returns { dataUrl, blob }
 */
export async function renderPhotoboothComposite(imageSrc, selectedFrame, isMirrored = false, currentEvent = null, filterId = 'original') {
  const frameId = typeof selectedFrame === 'object' ? selectedFrame?.id : selectedFrame;
  console.log("Selected Frame in renderPhotoboothComposite:", frameId);

  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const width = 1080;
  const height = 1440;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  drawPhotoboothFrameToCanvas(ctx, width, height, img, frameId, isMirrored, currentEvent, filterId);

  if (selectedFrame?.overlay_url) {
    try {
      const customOverlay = await loadImage(selectedFrame.overlay_url);
      ctx.drawImage(customOverlay, 0, 0, width, height);
    } catch (e) {
      console.warn('Custom overlay draw error in photo composite:', e);
    }
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.94));
  return { dataUrl, blob };
}

export function getMultiPhotoSlots(selectedFrame) {
  const slots = selectedFrame?.frame_slots || selectedFrame?.slots;
  if (slots?.length) return slots;

  const frameId = typeof selectedFrame === 'object' ? selectedFrame?.id : selectedFrame;
  if (frameId === 'frame-06') {
    return [
      { x: 108, y: 64, width: 864, height: 366 },
      { x: 108, y: 450, width: 864, height: 366 },
      { x: 108, y: 836, width: 864, height: 366 },
    ];
  }
  if (frameId === 'frame-07') {
    return [
      { x: 72, y: 64, width: 456, height: 1148 },
      { x: 552, y: 64, width: 456, height: 564 },
      { x: 552, y: 648, width: 456, height: 564 },
    ];
  }
  return [
    { x: 72, y: 64, width: 936, height: 560 },
    { x: 72, y: 644, width: 456, height: 576 },
    { x: 552, y: 644, width: 456, height: 576 },
  ];
}

/**
 * Composites Multi-Photo Collage (up to 3 photos) into defined slot layout.
 * Each slot gets cover clipping and refined border, plus wedding typography.
 * Supports:
 * - frame-04: Three Moments (1 Top + 2 Bottom)
 * - frame-06: Trio Photostrip (3 Vertical Strips)
 * - frame-07: Trio Asymmetric (1 Tall Left + 2 Stacked Right)
 * Returns { dataUrl, blob }
 */
export async function renderMultiPhotoComposite(photos, selectedFrame, isMirrored = false, currentEvent = null, filterId = 'original') {
  const frameId = typeof selectedFrame === 'object' ? selectedFrame?.id : selectedFrame;
  console.log("Rendering Multi Photo Composite with Frame:", frameId, "Photos count:", photos.length);
  const filterPreset = getFilterById(filterId);

  // Dynamic event text values strictly from currentEvent
  const eventName = currentEvent?.name || '';
  const rawDate = currentEvent?.event_date || '';
  const formattedIndoDate = formatIndonesianDate(rawDate);

  // Temporary debugging console log as strictly requested by user:
  console.log('[FRAME EVENT] currentEvent.name', currentEvent?.name);
  console.log('[FRAME EVENT] currentEvent.event_date', currentEvent?.event_date);

  const loadedPhotos = await Promise.all(photos.map((src) => loadImage(src)));

  const canvas = document.createElement('canvas');
  const width = 1080;
  const height = 1440;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 1. Warm ivory background
  ctx.fillStyle = '#faf7f2';
  ctx.fillRect(0, 0, width, height);

  // 2. Outer decorative double frame
  ctx.strokeStyle = '#5c4033';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  ctx.strokeStyle = '#c8a882';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  // Slot definitions based on frame layout
  const slots = getMultiPhotoSlots(selectedFrame);

  // Draw each photo into its designated slot with object-fit: cover
  loadedPhotos.forEach((photo, idx) => {
    const slot = slots[idx] || slots[0];
    const radius = Math.round(Number(slot.border_radius) || 12);

    ctx.save();
    // Clip rounded rectangle for slot
    ctx.beginPath();
    ctx.moveTo(slot.x + radius, slot.y);
    ctx.lineTo(slot.x + slot.width - radius, slot.y);
    ctx.quadraticCurveTo(slot.x + slot.width, slot.y, slot.x + slot.width, slot.y + radius);
    ctx.lineTo(slot.x + slot.width, slot.y + slot.height - radius);
    ctx.quadraticCurveTo(slot.x + slot.width, slot.y + slot.height, slot.x + slot.width - radius, slot.y + slot.height);
    ctx.lineTo(slot.x + radius, slot.y + slot.height);
    ctx.quadraticCurveTo(slot.x, slot.y + slot.height, slot.x, slot.y + slot.height - radius);
    ctx.lineTo(slot.x, slot.y + radius);
    ctx.quadraticCurveTo(slot.x, slot.y, slot.x + radius, slot.y);
    ctx.closePath();
    ctx.clip();

    // Apply photo filter strictly to user photo (frame decor is unaffected)
    if (filterPreset && filterPreset.canvasFilter && filterPreset.canvasFilter !== 'none') {
      try {
        ctx.filter = filterPreset.canvasFilter;
      } catch (e) {
        console.warn('Canvas filter apply warning:', e);
      }
    }

    // Cover calculations
    const pW = photo.videoWidth || photo.naturalWidth || photo.width || 1;
    const pH = photo.videoHeight || photo.naturalHeight || photo.height || 1;
    const pAspect = pW / pH;
    const sAspect = slot.width / slot.height;
    let dW, dH, dX, dY;

    if (pAspect > sAspect) {
      dH = slot.height;
      dW = slot.height * pAspect;
      dX = slot.x - (dW - slot.width) / 2;
      dY = slot.y;
    } else {
      dW = slot.width;
      dH = slot.width / pAspect;
      dX = slot.x;
      dY = slot.y - (dH - slot.height) / 2;
    }

    if (isMirrored) {
      ctx.save();
      ctx.translate(slot.x + slot.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(photo, slot.x - dX, dY, dW, dH);
      ctx.restore();
    } else {
      ctx.drawImage(photo, dX, dY, dW, dH);
    }
    ctx.restore();

    // Draw slot gold border
    ctx.strokeStyle = '#c8a882';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(slot.x, slot.y, slot.width, slot.height, radius);
    ctx.stroke();

    // Subtle slot badge (01, 02, 03)
    ctx.fillStyle = 'rgba(250, 247, 242, 0.9)';
    ctx.beginPath();
    ctx.roundRect(slot.x + 12, slot.y + 12, 34, 20, 6);
    ctx.fill();

    ctx.fillStyle = '#5c4033';
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`0${idx + 1}`, slot.x + 29, slot.y + 26);
  });

  // Custom transparent PNG overlay from Supabase Storage if uploaded
  if (selectedFrame?.overlay_url) {
    try {
      const overlayImg = await loadImage(selectedFrame.overlay_url);
      ctx.drawImage(overlayImg, 0, 0, width, height);
    } catch (e) {
      console.warn('Custom overlay draw error in multi-composite:', e);
    }
  }

  // 3. Wedding Typography at bottom zone
  const textCenterY = height - 130;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8c7365';
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('THE WEDDING OF', width / 2, textCenterY - 40);

  if (eventName) {
    ctx.fillStyle = '#3a2820';
    ctx.font = '600 52px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(eventName, width / 2, textCenterY + 15);
  }

  const frameLabel = frameId === 'frame-06'
    ? 'Classic Photostrip'
    : frameId === 'frame-07'
    ? 'Modern Asymmetric'
    : 'Three Moments';
  const subLabel = formattedIndoDate ? `${frameLabel} · ${formattedIndoDate}` : frameLabel;

  ctx.fillStyle = '#7a6052';
  ctx.font = '400 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subLabel, width / 2, textCenterY + 54);

  ctx.fillStyle = '#b3a093';
  ctx.font = '400 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('XLVI VIRTUAL PHOTOBOOTH', width / 2, height - 48);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.94));
  return { dataUrl, blob };
}

/**
 * Generates an Instagram-style Boomerang Video.
 *
 * SPECIFICATION (Strict User Requirement):
 * - Forward duration: 1000ms (1.0 second)
 * - Reverse duration: 1000ms (1.0 second)
 * - Total Boomerang duration: 2000ms (2.0 seconds)
 * - Target FPS: 25 FPS (25 forward frames + 25 reverse frames = 50 frames at 40ms interval = exactly 2000ms).
 * - Every single frame receives the SELECTED wedding frame overlay & typography!
 */
export async function generateBoomerangVideo({ rawFrames, selectedFrame, frameId, isMirrored = false, currentEvent = null, filterId = 'original' }) {
  const activeFrame = selectedFrame || { id: frameId || 'frame-01' };
  const targetFrameId = typeof activeFrame === 'object' ? activeFrame.id : (activeFrame || 'frame-01');

  return new Promise(async (resolve, reject) => {
    try {
      if (!rawFrames || rawFrames.length === 0) {
        return reject(new Error('Tidak ada frame boomerang untuk diproses.'));
      }

      // Convert raw frames to loaded Image/Canvas elements
      const loadedFrames = await Promise.all(
        rawFrames.map((f) => loadImage(f))
      );

      // Construct ping-pong sequence:
      // Forward: 0, 1, 2, ..., N-1
      // Reverse: N-1, N-2, ..., 0 (or N-2 down to 0)
      // Exactly 1.0 second forward + 1.0 second reverse = 2.0 seconds total!
      const n = loadedFrames.length;
      const sequence = [];
      // 1.0s forward:
      for (let i = 0; i < n; i++) sequence.push(i);
      // 1.0s reverse:
      for (let i = n - 1; i >= 0; i--) sequence.push(i);

      // Frame rate & timing:
      // 25 forward frames recorded over 1000ms = 40ms per frame = 25 FPS
      // 25 reverse frames replayed over 1000ms = 40ms per frame = 25 FPS
      // Total 50 frames * 40ms = 2000ms (2.0s)
      const fps = 25;
      const frameIntervalMs = Math.round(1000 / fps); // 40ms
      const forwardDurationMs = n * frameIntervalMs;
      const reverseDurationMs = n * frameIntervalMs;
      const totalDurationMs = sequence.length * frameIntervalMs;

      // Debugging logs as strictly required by prompt specification:
      console.log("Boomerang duration:", totalDurationMs, `ms (~${(totalDurationMs / 1000).toFixed(1)}s: ${forwardDurationMs}ms forward + ${reverseDurationMs}ms reverse)`);
      console.log("Boomerang FPS:", fps);
      console.log("Captured frames:", loadedFrames.length);
      console.log("Final sequence:", sequence.length);
      console.log("Selected Frame for Boomerang:", targetFrameId);

      // Canvas size for high-speed mobile encoding
      const width = 720;
      const height = 960;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Preload custom overlay PNG if exists
      const loadedOverlay = activeFrame?.overlay_url ? await loadImage(activeFrame.overlay_url).catch(() => null) : null;

      // Generate poster thumbnail using frame 0
      drawPhotoboothFrameToCanvas(ctx, width, height, loadedFrames[0], targetFrameId, isMirrored, currentEvent, filterId);
      if (loadedOverlay) {
        ctx.drawImage(loadedOverlay, 0, 0, width, height);
      }
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.92);

      // Check captureStream and MediaRecorder support
      if (!canvas.captureStream || typeof MediaRecorder === 'undefined') {
        return resolve({
          videoUrl: thumbnailUrl,
          videoBlob: null,
          thumbnailUrl,
          type: 'boomerang',
          selectedFrame: activeFrame,
          frameId: targetFrameId
        });
      }

      // Find best supported video MIME type
      const mimeTypes = [
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ];
      let selectedMime = '';
      for (const t of mimeTypes) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
          selectedMime = t;
          break;
        }
      }

      if (!selectedMime) {
        return resolve({
          videoUrl: thumbnailUrl,
          videoBlob: null,
          thumbnailUrl,
          type: 'boomerang',
          selectedFrame: activeFrame,
          frameId: targetFrameId
        });
      }

      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 2500000
      });

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: selectedMime });
        const videoUrl = URL.createObjectURL(videoBlob);
        resolve({
          videoUrl,
          videoBlob,
          thumbnailUrl,
          type: 'boomerang',
          mimeType: selectedMime,
          frameId: targetFrameId,
          selectedFrame: activeFrame
        });
      };

      recorder.start();

      // Play the sequence frame by frame onto canvas with the chosen frame overlay applied to EVERY frame!
      let seqIndex = 0;
      const intervalId = setInterval(() => {
        if (seqIndex >= sequence.length) {
          clearInterval(intervalId);
          setTimeout(() => {
            if (recorder.state === 'recording') recorder.stop();
          }, 150);
          return;
        }

        const frameIdx = sequence[seqIndex];
        const currentFrameImg = loadedFrames[frameIdx];
        drawPhotoboothFrameToCanvas(ctx, width, height, currentFrameImg, targetFrameId, isMirrored, currentEvent, filterId);
        if (loadedOverlay) {
          ctx.drawImage(loadedOverlay, 0, 0, width, height);
        }
        seqIndex++;
      }, frameIntervalMs);

    } catch (err) {
      console.error('generateBoomerangVideo error:', err);
      reject(err);
    }
  });
}

/**
 * Download helper for files
 */
export function downloadFile(urlOrBlob, filename = 'photobooth-nela-fadli.jpg') {
  const isBlob = urlOrBlob instanceof Blob;
  const link = document.createElement('a');
  const objectUrl = isBlob ? URL.createObjectURL(urlOrBlob) : urlOrBlob;

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (isBlob) {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  }
}

export async function downloadMediaFile(urlOrBlob, filename) {
  if (!urlOrBlob) throw new Error('File foto tidak tersedia untuk diunduh.');

  const link = document.createElement('a');
  const supportsDownload = 'download' in link;
  const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const canOpenMediaDirectly = typeof urlOrBlob === 'string'
    && /^(https?:\/\/|blob:|data:)/i.test(urlOrBlob);
  if ((!supportsDownload || isAppleMobile) && canOpenMediaDirectly) {
    const opened = window.open(urlOrBlob, '_blank');
    if (!opened) throw new Error('Browser memblokir tab gambar. Izinkan pop-up lalu coba lagi.');
    opened.opener = null;
    return { method: 'opened' };
  }

  let blob;
  if (urlOrBlob instanceof Blob) {
    blob = urlOrBlob;
  } else if (typeof urlOrBlob === 'string') {
    const response = await fetch(urlOrBlob);
    if (!response.ok) {
      throw new Error(`Gagal mengambil foto dari galeri (HTTP ${response.status}).`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.toLowerCase().includes('text/html')) {
      throw new Error('Sumber unduhan mengembalikan halaman web, bukan file foto.');
    }
    blob = await response.blob();
  } else {
    throw new Error('Format sumber foto tidak didukung untuk diunduh.');
  }

  if (!blob.size) throw new Error('File foto kosong dan tidak dapat diunduh.');

  const objectUrl = URL.createObjectURL(blob);
  if (!supportsDownload || isAppleMobile) {
    const opened = window.open(objectUrl, '_blank');
    if (!opened) {
      URL.revokeObjectURL(objectUrl);
      throw new Error('Browser memblokir tab gambar. Izinkan pop-up lalu coba lagi.');
    }
    opened.opener = null;
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return { method: 'opened' };
  }

  link.href = objectUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
  return { method: 'downloaded' };
}

export function downloadImage(dataUrl, filename) {
  downloadFile(dataUrl, filename || `xlvi-photobooth-${Date.now()}.jpg`);
}

/**
 * Native Browser 9:16 Video Generator
 * Combines final framed photo with audio voice note into an MP4/WebM video
 * suitable for Instagram Stories.
 */
export async function generateStoryVideo({ photoDataUrl, audioBlob, guestName = 'Tamu', currentEvent = null }) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!audioBlob) {
        return reject(new Error('Audio voice note tidak ditemukan.'));
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return reject(new Error('Web Audio API tidak didukung browser ini.'));
      }

      const audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      let audioBuffer;
      try {
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      } catch (e) {
        console.warn('Direct decodeAudioData issue, trying audio element route:', e);
        return reject(e);
      }

      const duration = Math.max(1, audioBuffer.duration);

      const storyWidth = 720;
      const storyHeight = 1280;
      const canvas = document.createElement('canvas');
      canvas.width = storyWidth;
      canvas.height = storyHeight;
      const ctx = canvas.getContext('2d');

      if (!canvas.captureStream) {
        return reject(new Error('canvas.captureStream tidak didukung di browser ini.'));
      }

      const img = await loadImage(photoDataUrl);

      const mimeTypes = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      let selectedMime = '';
      for (const t of mimeTypes) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
          selectedMime = t;
          break;
        }
      }

      if (!selectedMime) {
        return reject(new Error('Tidak ada format video yang didukung di perangkat ini.'));
      }

      const audioDestination = audioCtx.createMediaStreamDestination();
      const bufferSource = audioCtx.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(audioDestination);

      const canvasStream = canvas.captureStream(25);
      const combinedStream = new MediaStream([
        canvasStream.getVideoTracks()[0],
        audioDestination.stream.getAudioTracks()[0]
      ]);

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 2500000
      });

      const videoChunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          videoChunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(videoChunks, { type: selectedMime });
        const extension = selectedMime.includes('mp4') ? 'mp4' : 'webm';
        const fileName = `xlvi-photobooth-${Date.now()}.${extension}`;
        const videoFile = new File([videoBlob], fileName, { type: selectedMime });
        const videoUrl = URL.createObjectURL(videoBlob);

        audioCtx.close();
        resolve({
          videoBlob,
          videoFile,
          videoUrl,
          fileName,
          mimeType: selectedMime
        });
      };

      const startTime = performance.now();
      let animFrameId = null;

      function renderFrame(now) {
        const elapsed = (now - startTime) / 1000;
        const progress = Math.min(1, elapsed / duration);

        const grad = ctx.createLinearGradient(0, 0, 0, storyHeight);
        grad.addColorStop(0, '#f2ece4');
        grad.addColorStop(0.5, '#faf7f2');
        grad.addColorStop(1, '#ebdcd0');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, storyWidth, storyHeight);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#8c7365';
        ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
        const storyTitle = currentEvent?.name ? `THE CELEBRATION OF ${currentEvent.name.toUpperCase()}` : 'THE WEDDING CELEBRATION';
        ctx.fillText(storyTitle, storyWidth / 2, 70);

        ctx.fillStyle = '#3a2820';
        ctx.font = '600 24px "Cormorant Garamond", Georgia, serif';
        ctx.fillText('Special Guest Memories', storyWidth / 2, 104);

        const cardW = 580;
        const cardH = Math.round(cardW * (4 / 3));
        const cardX = (storyWidth - cardW) / 2;
        const cardY = 145;

        ctx.save();
        ctx.shadowColor = 'rgba(92, 64, 51, 0.18)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 12;
        ctx.drawImage(img, cardX, cardY, cardW, cardH);
        ctx.restore();

        const waveCenterY = cardY + cardH + 75;

        ctx.textAlign = 'center';
        ctx.fillStyle = '#5c4033';
        ctx.font = '600 18px "Cormorant Garamond", Georgia, serif';
        ctx.fillText(`🎙️ Ucapan Hangat dari ${guestName}`, storyWidth / 2, waveCenterY - 20);

        const numBars = 20;
        const barSpacing = 8;
        const totalWaveW = (numBars * 4) + ((numBars - 1) * barSpacing);
        const startX = (storyWidth - totalWaveW) / 2;

        ctx.fillStyle = '#5c4033';
        for (let i = 0; i < numBars; i++) {
          const bx = startX + (i * (4 + barSpacing));
          const waveHeight = 6 + Math.abs(Math.sin((elapsed * 5) + (i * 0.45))) * 28;
          ctx.beginPath();
          ctx.roundRect(bx, waveCenterY - (waveHeight / 2), 4, waveHeight, 2);
          ctx.fill();
        }

        const barW = 320;
        const barH = 4;
        const barX = (storyWidth - barW) / 2;
        const barY = waveCenterY + 35;

        ctx.fillStyle = '#e2d5c7';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 2);
        ctx.fill();

        ctx.fillStyle = '#5c4033';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * progress, barH, 2);
        ctx.fill();

        ctx.fillStyle = '#a69588';
        ctx.font = '400 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('POWERED BY XLVI DIGITAL', storyWidth / 2, storyHeight - 45);

        if (elapsed < duration) {
          animFrameId = requestAnimationFrame(renderFrame);
        }
      }

      recorder.start();
      bufferSource.start(0);
      animFrameId = requestAnimationFrame(renderFrame);

      bufferSource.onended = () => {
        setTimeout(() => {
          if (animFrameId) cancelAnimationFrame(animFrameId);
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, 300);
      };

      setTimeout(() => {
        if (recorder.state === 'recording') {
          if (animFrameId) cancelAnimationFrame(animFrameId);
          recorder.stop();
        }
      }, (duration * 1000) + 1500);

    } catch (err) {
      reject(err);
    }
  });
}
