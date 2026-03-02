import { pipeline, env } from '@huggingface/transformers';

// Disable local model checks — we always fetch from HF Hub / cache
env.allowLocalModels = false;

let transcriber = null;

async function loadPipeline() {
  if (transcriber) return transcriber;

  // Prefer WebGPU, fall back to WASM
  const device = navigator.gpu ? 'webgpu' : 'wasm';

  transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
    device,
    progress_callback: (progress) => {
      if (progress.status === 'progress') {
        self.postMessage({
          status: 'loading',
          file: progress.file,
          progress: progress.progress,
        });
      }
    },
  });

  return transcriber;
}

self.addEventListener('message', async (e) => {
  const { audio } = e.data;

  try {
    self.postMessage({ status: 'initiate' });

    const pipe = await loadPipeline();

    self.postMessage({ status: 'ready' });
    self.postMessage({ status: 'transcribing', progress: 0 });

    const result = await pipe(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
      callback_function: (output) => {
        // Chunk callback — estimate progress from chunks
        if (output && output.length > 0) {
          self.postMessage({
            status: 'transcribing_chunk',
            text: output[0],
          });
        }
      },
    });

    self.postMessage({
      status: 'complete',
      text: result.text.trim(),
    });
  } catch (err) {
    self.postMessage({
      status: 'error',
      error: err.message || String(err),
    });
  }
});
