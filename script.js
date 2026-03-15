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
// Export / Import
// ---------------------------------------------------------------------------

const EXPORT_VERSION = 1;

/** Compute summary statistics for a prompts array. */
function computeStats(prompts) {
  const rated = prompts.filter((p) => p.rating != null);
  const averageRating =
    rated.length > 0
      ? Math.round((rated.reduce((sum, p) => sum + p.rating, 0) / rated.length) * 10) / 10
      : null;

  const modelCounts = {};
  prompts.forEach((p) => {
    const model = p.metadata?.model;
    if (model) modelCounts[model] = (modelCounts[model] || 0) + 1;
  });
  const mostUsedModel =
    Object.keys(modelCounts).length > 0
      ? Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  return { totalPrompts: prompts.length, averageRating, mostUsedModel };
}

/** Download the full library as a timestamped JSON file. */
function exportLibrary() {
  const prompts = getPrompts();
  const exportData = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    stats: computeStats(prompts),
    prompts,
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prompt-library-export-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate the parsed JSON from an import file.
 * Throws a descriptive Error on any structural problem.
 */
function validateImportData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid file: expected a JSON object.');
  }
  if (data.version !== EXPORT_VERSION) {
    throw new Error(
      `Unsupported export version "${data.version}". This app supports version ${EXPORT_VERSION}.`
    );
  }
  if (!Array.isArray(data.prompts)) {
    throw new Error('Invalid file: missing "prompts" array.');
  }
  data.prompts.forEach((p, i) => {
    if (!p.id || typeof p.id !== 'string') {
      throw new Error(`Prompt at index ${i} is missing a valid "id" field.`);
    }
    if (!p.title || typeof p.title !== 'string') {
      throw new Error(`Prompt at index ${i} is missing a valid "title" field.`);
    }
    if (typeof p.content !== 'string') {
      throw new Error(`Prompt at index ${i} is missing a valid "content" field.`);
    }
  });
}

// Holds validated import data between file-read and user confirmation.
let pendingImportData = null;

/** Show an inline error message below the library header. */
function showImportError(message) {
  const el = document.getElementById('import-error');
  el.textContent = message;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

/** Open the merge-conflict modal after a file has been validated. */
function showImportModal(totalCount, duplicateCount) {
  const info = document.getElementById('import-modal-info');
  const noDuplicateOptions = document.getElementById('import-options');

  if (duplicateCount === 0) {
    info.textContent = `Ready to import ${totalCount} prompt${totalCount !== 1 ? 's' : ''}. No conflicts with existing prompts.`;
    // Hide merge options — plain merge-skip is fine; surface "replace" only
    noDuplicateOptions.querySelector('[value="merge-overwrite"]').closest('label').style.display = 'none';
  } else {
    info.textContent =
      `Found ${totalCount} prompt${totalCount !== 1 ? 's' : ''} — ` +
      `${duplicateCount} already exist${duplicateCount === 1 ? 's' : ''} in your library.`;
    noDuplicateOptions.querySelector('[value="merge-overwrite"]').closest('label').style.display = '';
  }

  // Reset radio to default
  document.querySelector('input[name="import-mode"][value="merge-skip"]').checked = true;

  document.getElementById('import-modal').style.display = 'flex';
}

function hideImportModal() {
  document.getElementById('import-modal').style.display = 'none';
}

/**
 * Read and validate a JSON file chosen by the user.
 * On success, opens the confirmation modal.
 */
function handleImportFile(file) {
  if (!file) return;
  if (!file.name.endsWith('.json')) {
    showImportError('Please select a .json file exported from this app.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      let data = JSON.parse(e.target.result);

      // Accept a raw prompts array (e.g. a direct localStorage backup) by
      // wrapping it in the versioned envelope so the rest of the pipeline
      // works identically for both formats.
      if (Array.isArray(data)) {
        data = {
          version: EXPORT_VERSION,
          exportedAt: new Date().toISOString(),
          stats: computeStats(data),
          prompts: data,
        };
      }

      validateImportData(data);
      pendingImportData = data;

      const existingIds = new Set(getPrompts().map((p) => p.id));
      const duplicateCount = data.prompts.filter((p) => existingIds.has(p.id)).length;
      showImportModal(data.prompts.length, duplicateCount);
    } catch (err) {
      showImportError('Import failed: ' + err.message);
    }
  };
  reader.onerror = () => showImportError('Could not read the file. Please try again.');
  reader.readAsText(file);
}

/**
 * Perform the actual import using the selected merge strategy.
 * Backs up existing data and rolls back if anything goes wrong.
 * @param {'replace'|'merge-skip'|'merge-overwrite'} mode
 */
function performImport(mode) {
  if (!pendingImportData) return;

  // Snapshot existing data for rollback
  const backup = localStorage.getItem(STORAGE_KEY);

  try {
    const incoming = pendingImportData.prompts;

    if (mode === 'replace') {
      savePrompts(incoming);
    } else {
      const existing = getPrompts();
      const existingMap = new Map(existing.map((p) => [p.id, p]));

      if (mode === 'merge-skip') {
        const newOnly = incoming.filter((p) => !existingMap.has(p.id));
        savePrompts([...existing, ...newOnly]);
      } else {
        // merge-overwrite: update duplicates, append brand-new ones
        incoming.forEach((p) => existingMap.set(p.id, p));
        savePrompts(Array.from(existingMap.values()));
      }
    }

    pendingImportData = null;
    hideImportModal();
    renderPrompts();
  } catch (err) {
    // Rollback to pre-import state
    if (backup !== null) {
      localStorage.setItem(STORAGE_KEY, backup);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    pendingImportData = null;
    hideImportModal();
    showImportError('Import failed and was rolled back: ' + err.message);
  }
}

// Wire up export button
document.getElementById('export-btn').addEventListener('click', exportLibrary);

// Wire up the hidden file input (triggered by the <label>)
document.getElementById('import-file-input').addEventListener('change', (e) => {
  handleImportFile(e.target.files[0]);
  // Reset so the same file can be re-selected if needed
  e.target.value = '';
});

// Modal confirm
document.getElementById('import-confirm-btn').addEventListener('click', () => {
  const mode = document.querySelector('input[name="import-mode"]:checked').value;
  performImport(mode);
});

// Modal cancel
document.getElementById('import-cancel-btn').addEventListener('click', () => {
  pendingImportData = null;
  hideImportModal();
});

// Close modal on backdrop click
document.getElementById('import-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    pendingImportData = null;
    hideImportModal();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('import-modal').style.display !== 'none') {
    pendingImportData = null;
    hideImportModal();
  }
});

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
