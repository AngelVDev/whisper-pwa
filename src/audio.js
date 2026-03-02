/**
 * Decode an audio File to Float32Array at 16 kHz mono.
 * Primary: AudioContext.decodeAudioData (handles mp3, wav, ogg, aac, m4a, webm natively).
 * Fallback: ffmpeg.wasm converts to WAV first, then decodes via AudioContext.
 */

/**
 * @param {File} file
 * @param {(msg: string) => void} onStatus - status callback for UI
 * @returns {Promise<Float32Array>}
 */
export async function decodeAudio(file, onStatus = () => {}) {
  const arrayBuffer = await file.arrayBuffer();

  // Try native AudioContext first
  try {
    onStatus('decoding');
    return await decodeWithAudioContext(arrayBuffer);
  } catch (_nativeErr) {
    // Native decode failed — use ffmpeg fallback
    onStatus('ffmpeg_loading');
    return await decodeWithFfmpeg(file, onStatus);
  }
}

async function decodeWithAudioContext(arrayBuffer) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: 16000,
  });

  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    // Mix down to mono
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0);
    }
    const mono = new Float32Array(audioBuffer.length);
    const channels = audioBuffer.numberOfChannels;
    for (let ch = 0; ch < channels; ch++) {
      const data = audioBuffer.getChannelData(ch);
      for (let i = 0; i < mono.length; i++) {
        mono[i] += data[i] / channels;
      }
    }
    return mono;
  } finally {
    await ctx.close();
  }
}

async function decodeWithFfmpeg(file, onStatus) {
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { fetchFile } = await import('@ffmpeg/util');

  const ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ message }) => {
    if (message.includes('time=')) {
      onStatus('ffmpeg_converting');
    }
  });

  // Load single-thread core from CDN
  await ffmpeg.load({
    coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js',
    wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm',
  });

  onStatus('ffmpeg_converting');

  const ext = file.name.split('.').pop().toLowerCase();
  const inputName = `input.${ext}`;
  const outputName = 'output.wav';

  await ffmpeg.writeFile(inputName, await fetchFile(file));
  await ffmpeg.exec([
    '-i', inputName,
    '-ar', '16000',
    '-ac', '1',
    '-f', 'wav',
    outputName,
  ]);

  const wavData = await ffmpeg.readFile(outputName);

  // Clean up
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  ffmpeg.terminate();

  // Decode the WAV via AudioContext
  onStatus('decoding');
  return await decodeWithAudioContext(wavData.buffer);
}
