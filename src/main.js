import './style.css';
import { sanitizeFile } from './sanitize.js';
import { decodeAudio } from './audio.js';
import { initI18n, setLang, getLang, t, renderI18n } from './i18n.js';
import { initInstall } from './install.js';

// --- DOM refs ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const errorMsg = document.getElementById('error-msg');
const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const resultSection = document.getElementById('result-section');
const resultText = document.getElementById('result-text');
const btnCopy = document.getElementById('btn-copy');
const btnNew = document.getElementById('btn-new');
const langToggle = document.getElementById('lang-toggle');

// --- Worker ---
let worker = null;

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./whisper.worker.js', import.meta.url), {
      type: 'module',
    });
  }
  return worker;
}

// --- UI helpers ---
function showError(key) {
  errorMsg.textContent = t(key);
  errorMsg.hidden = false;
}

function hideError() {
  errorMsg.hidden = true;
}

function showProgress(text, percent) {
  progressSection.hidden = false;
  progressText.textContent = text;
  if (percent === null) {
    progressBar.className = 'progress-bar indeterminate';
    progressBar.style.width = '';
  } else {
    progressBar.className = 'progress-bar';
    progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }
}

function hideProgress() {
  progressSection.hidden = true;
  progressBar.style.width = '0%';
  progressBar.className = 'progress-bar';
}

function showResult(text) {
  resultSection.hidden = false;
  resultText.textContent = text;
}

function resetUI() {
  hideError();
  hideProgress();
  resultSection.hidden = true;
  fileInfo.hidden = true;
  dropZone.hidden = false;
  resultText.textContent = '';
  fileInput.value = '';
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Core flow ---
async function handleFile(file) {
  hideError();
  hideProgress();
  resultSection.hidden = true;

  // Validate
  const check = sanitizeFile(file);
  if (!check.ok) {
    showError(`err_${check.error}`);
    return;
  }

  // Show file info
  fileName.textContent = file.name;
  fileSize.textContent = formatSize(file.size);
  fileInfo.hidden = false;
  dropZone.hidden = true;

  // Decode audio
  let audioData;
  try {
    audioData = await decodeAudio(file, (status) => {
      showProgress(t(`status_${status}`), null);
    });
  } catch (err) {
    showError('err_decode_failed');
    console.error('Decode error:', err);
    return;
  }

  // Send to worker
  showProgress(t('status_initiate'), null);

  const w = getWorker();

  w.onmessage = (e) => {
    const msg = e.data;
    switch (msg.status) {
      case 'initiate':
        showProgress(t('status_initiate'), null);
        break;
      case 'loading':
        showProgress(
          `${t('status_loading')} ${msg.file ? msg.file.split('/').pop() : ''}`,
          msg.progress ?? null,
        );
        break;
      case 'ready':
        showProgress(t('status_ready'), 100);
        break;
      case 'transcribing':
        showProgress(t('status_transcribing'), null);
        break;
      case 'transcribing_chunk':
        showProgress(t('status_transcribing'), null);
        break;
      case 'complete':
        hideProgress();
        showResult(msg.text);
        break;
      case 'error':
        hideProgress();
        showError('status_error');
        console.error('Worker error:', msg.error);
        break;
    }
  };

  // Transfer the Float32Array (zero-copy)
  w.postMessage({ audio: audioData }, [audioData.buffer]);
}

// --- Event listeners ---

// Drop zone click
dropZone.addEventListener('click', () => fileInput.click());

// File input change
fileInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) handleFile(file);
});

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files?.[0];
  if (file) handleFile(file);
});

// Copy button
btnCopy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resultText.textContent);
    btnCopy.textContent = t('btn_copied');
    setTimeout(() => {
      btnCopy.textContent = t('btn_copy');
    }, 1500);
  } catch {
    // Fallback: select text
    const range = document.createRange();
    range.selectNodeContents(resultText);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
});

// New transcription
btnNew.addEventListener('click', resetUI);

// Language toggle
langToggle.addEventListener('click', () => {
  const next = getLang() === 'en' ? 'es' : 'en';
  setLang(next);
  langToggle.textContent = t('lang_toggle');
});

// --- Init ---
initI18n();
langToggle.textContent = t('lang_toggle');
initInstall();
