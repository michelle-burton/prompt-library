const STORAGE_KEY = 'prompt-library';

const form = document.getElementById('prompt-form');
const titleInput = document.getElementById('title');
const modelInput = document.getElementById('model');
const contentInput = document.getElementById('content');
const isCodeInput = document.getElementById('is-code');
const promptList = document.getElementById('prompt-list');
const emptyState = document.getElementById('empty-state');

// ---------------------------------------------------------------------------
// Metadata functions
// ---------------------------------------------------------------------------

/**
 * @typedef {{ min: number, max: number, confidence: 'high'|'medium'|'low' }} TokenEstimate
 * @typedef {{ model: string, createdAt: string, updatedAt: string, tokenEstimate: TokenEstimate }} MetadataObject
 */

/**
 * Estimates token count for a given text.
 * @param {string} text
 * @param {boolean} isCode
 * @returns {TokenEstimate}
 */
function estimateTokens(text, isCode) {
  if (typeof text !== 'string') throw new Error('estimateTokens: text must be a string');

  const wordCount = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
  const charCount = text.length;

  let min = 0.75 * wordCount;
  let max = 0.25 * charCount;

  if (isCode) {
    min *= 1.3;
    max *= 1.3;
  }

  min = Math.round(min);
  max = Math.round(max);

  const confidence = max < 1000 ? 'high' : max <= 5000 ? 'medium' : 'low';

  return { min, max, confidence };
}

/**
 * Creates a metadata object for a prompt.
 * @param {string} modelName
 * @param {string} content
 * @returns {MetadataObject}
 */
function trackModel(modelName, content) {
  if (typeof modelName !== 'string' || modelName.trim().length === 0) {
    throw new Error('trackModel: modelName must be a non-empty string');
  }
  if (modelName.length > 100) {
    throw new Error('trackModel: modelName must be 100 characters or fewer');
  }
  if (typeof content !== 'string') {
    throw new Error('trackModel: content must be a string');
  }

  const now = new Date().toISOString();

  return {
    model: modelName.trim(),
    createdAt: now,
    updatedAt: now,
    tokenEstimate: estimateTokens(content, false),
  };
}

/**
 * Updates the updatedAt timestamp on a metadata object.
 * @param {MetadataObject} metadata
 * @returns {MetadataObject}
 */
function updateTimestamps(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    throw new Error('updateTimestamps: metadata must be an object');
  }
  if (!isValidIso8601(metadata.createdAt)) {
    throw new Error('updateTimestamps: metadata.createdAt is not a valid ISO 8601 string');
  }

  const now = new Date().toISOString();

  if (now < metadata.createdAt) {
    throw new Error('updateTimestamps: updatedAt cannot be earlier than createdAt');
  }

  return { ...metadata, updatedAt: now };
}

/**
 * Validates an ISO 8601 date string (YYYY-MM-DDTHH:mm:ss.sssZ format).
 * @param {string} str
 * @returns {boolean}
 */
function isValidIso8601(str) {
  if (typeof str !== 'string') return false;
  const iso8601Re = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  if (!iso8601Re.test(str)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(isoStr) {
  try {
    return new Date(isoStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

function getPrompts() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function savePrompts(prompts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

function preview(text) {
  return text.length > 60 ? text.slice(0, 60).trimEnd() + '…' : text;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderMetadata(metadata) {
  const t = metadata.tokenEstimate;
  return `
    <div class="card-metadata">
      <div class="metadata-row">
        <span class="metadata-label">Model</span>
        <span class="metadata-value metadata-model-name">${escapeHtml(metadata.model)}</span>
      </div>
      <div class="metadata-row">
        <span class="metadata-label">Created</span>
        <span class="metadata-value">${formatDate(metadata.createdAt)}</span>
      </div>
      <div class="metadata-row">
        <span class="metadata-label">Updated</span>
        <span class="metadata-value">${formatDate(metadata.updatedAt)}</span>
      </div>
      <div class="metadata-row">
        <span class="metadata-label">Tokens</span>
        <span class="metadata-value">~${t.min}–${t.max}
          <span class="confidence-badge confidence-${t.confidence}">${t.confidence}</span>
        </span>
      </div>
    </div>
  `;
}

function renderPrompts() {
  const prompts = getPrompts();
  promptList.innerHTML = '';

  if (prompts.length === 0) {
    emptyState.classList.add('visible');
    return;
  }

  emptyState.classList.remove('visible');

  // Sort by createdAt descending; fall back to legacy numeric createdAt
  const sorted = [...prompts].sort((a, b) => {
    const ta = a.metadata
      ? new Date(a.metadata.createdAt).getTime()
      : (a.createdAt || 0);
    const tb = b.metadata
      ? new Date(b.metadata.createdAt).getTime()
      : (b.createdAt || 0);
    return tb - ta;
  });

  sorted.forEach((prompt) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-title" title="${escapeHtml(prompt.title)}">${escapeHtml(prompt.title)}</div>
      <div class="card-preview">${escapeHtml(preview(prompt.content))}</div>
      ${prompt.metadata ? renderMetadata(prompt.metadata) : ''}
      <div class="card-stars">${renderStars(prompt)}</div>
      <div class="card-note-section">
        ${prompt.note
          ? `<div class="note-display">${escapeHtml(prompt.note)}</div>
             <div class="note-actions">
               <button class="note-edit-btn" data-id="${prompt.id}">Edit</button>
               <button class="note-delete-btn" data-id="${prompt.id}">Delete Note</button>
             </div>`
          : `<button class="note-add-btn" data-id="${prompt.id}">+ Add Note</button>`
        }
        <div class="note-editor" data-id="${prompt.id}" style="display:none;">
          <textarea class="note-textarea" data-id="${prompt.id}" rows="3" placeholder="Write a note...">${prompt.note ? escapeHtml(prompt.note) : ''}</textarea>
          <div class="note-editor-actions">
            <button class="note-save-btn" data-id="${prompt.id}">Save</button>
            <button class="note-cancel-btn" data-id="${prompt.id}">Cancel</button>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button class="delete-btn" data-id="${prompt.id}">Delete</button>
      </div>
    `;
    promptList.appendChild(card);
  });

  promptList.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => deletePrompt(btn.dataset.id));
  });

  promptList.querySelectorAll('.note-add-btn, .note-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => openNoteEditor(btn.dataset.id));
  });

  promptList.querySelectorAll('.note-save-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const textarea = promptList.querySelector(`.note-textarea[data-id="${btn.dataset.id}"]`);
      saveNote(btn.dataset.id, textarea.value.trim());
    });
  });

  promptList.querySelectorAll('.note-cancel-btn').forEach((btn) => {
    btn.addEventListener('click', () => closeNoteEditor());
  });

  promptList.querySelectorAll('.note-delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => deleteNote(btn.dataset.id));
  });

  promptList.querySelectorAll('.star').forEach((star) => {
    star.addEventListener('click', () => setRating(star.dataset.id, Number(star.dataset.star)));
    star.addEventListener('mouseover', () => highlightStars(star.dataset.id, Number(star.dataset.star)));
    star.addEventListener('mouseout', () => resetStarHighlight(star.dataset.id));
  });
}

function renderStars(prompt) {
  return Array.from({ length: 5 }, (_, i) => {
    const filled = prompt.rating && i < prompt.rating;
    return `<span class="star ${filled ? 'filled' : ''}" data-id="${prompt.id}" data-star="${i + 1}">★</span>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// Prompt mutations
// ---------------------------------------------------------------------------

function setRating(id, stars) {
  const prompts = getPrompts();
  const prompt = prompts.find((p) => p.id === id);
  prompt.rating = prompt.rating === stars ? null : stars;
  if (prompt.metadata) {
    try { prompt.metadata = updateTimestamps(prompt.metadata); } catch { /* ignore */ }
  }
  savePrompts(prompts);
  renderPrompts();
}

function highlightStars(id, upTo) {
  document.querySelectorAll(`.star[data-id="${id}"]`).forEach((star) => {
    star.classList.toggle('hovered', Number(star.dataset.star) <= upTo);
  });
}

function resetStarHighlight(id) {
  document.querySelectorAll(`.star[data-id="${id}"]`).forEach((star) => {
    star.classList.remove('hovered');
  });
}

function openNoteEditor(id) {
  const editor = promptList.querySelector(`.note-editor[data-id="${id}"]`);
  editor.style.display = 'block';
  editor.querySelector('textarea').focus();
  const addBtn = promptList.querySelector(`.note-add-btn[data-id="${id}"]`);
  if (addBtn) addBtn.style.display = 'none';
  const noteDisplay = editor.closest('.card-note-section').querySelector('.note-display');
  const noteActions = editor.closest('.card-note-section').querySelector('.note-actions');
  if (noteDisplay) noteDisplay.style.display = 'none';
  if (noteActions) noteActions.style.display = 'none';
}

function closeNoteEditor() {
  renderPrompts();
}

function saveNote(id, text) {
  if (!text) return;
  const prompts = getPrompts();
  const prompt = prompts.find((p) => p.id === id);
  prompt.note = text;
  if (prompt.metadata) {
    try { prompt.metadata = updateTimestamps(prompt.metadata); } catch { /* ignore */ }
  }
  savePrompts(prompts);
  renderPrompts();
}

function deleteNote(id) {
  const prompts = getPrompts();
  const prompt = prompts.find((p) => p.id === id);
  prompt.note = null;
  if (prompt.metadata) {
    try { prompt.metadata = updateTimestamps(prompt.metadata); } catch { /* ignore */ }
  }
  savePrompts(prompts);
  renderPrompts();
}

function deletePrompt(id) {
  const prompts = getPrompts().filter((p) => p.id !== id);
  savePrompts(prompts);
  renderPrompts();
}

// ---------------------------------------------------------------------------
// Form submit
// ---------------------------------------------------------------------------

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const modelName = modelInput.value.trim();
  const content = contentInput.value.trim();
  const isCode = isCodeInput.checked;

  if (!title || !modelName || !content) return;

  let metadata;
  try {
    metadata = trackModel(modelName, content);
    // Re-run token estimate with the actual isCode flag
    metadata.tokenEstimate = estimateTokens(content, isCode);
  } catch (err) {
    alert(err.message);
    return;
  }

  const prompts = getPrompts();
  prompts.unshift({
    id: crypto.randomUUID(),
    title,
    content,
    createdAt: Date.now(),
    metadata,
  });

  savePrompts(prompts);
  renderPrompts();
  form.reset();
  titleInput.focus();
});

renderPrompts();
