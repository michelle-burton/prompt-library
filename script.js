const STORAGE_KEY = 'prompt-library';

const form = document.getElementById('prompt-form');
const titleInput = document.getElementById('title');
const contentInput = document.getElementById('content');
const promptList = document.getElementById('prompt-list');
const emptyState = document.getElementById('empty-state');

function getPrompts() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function savePrompts(prompts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

function preview(text) {
  return text.length > 60 ? text.slice(0, 60).trimEnd() + '…' : text;
}

function renderPrompts() {
  const prompts = getPrompts();
  promptList.innerHTML = '';

  if (prompts.length === 0) {
    emptyState.classList.add('visible');
    return;
  }

  emptyState.classList.remove('visible');

  prompts.forEach((prompt) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-title" title="${escapeHtml(prompt.title)}">${escapeHtml(prompt.title)}</div>
      <div class="card-preview">${escapeHtml(preview(prompt.content))}</div>
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

function setRating(id, stars) {
  const prompts = getPrompts();
  const prompt = prompts.find((p) => p.id === id);
  prompt.rating = prompt.rating === stars ? null : stars;
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
  savePrompts(prompts);
  renderPrompts();
}

function deleteNote(id) {
  const prompts = getPrompts();
  const prompt = prompts.find((p) => p.id === id);
  prompt.note = null;
  savePrompts(prompts);
  renderPrompts();
}

function deletePrompt(id) {
  const prompts = getPrompts().filter((p) => p.id !== id);
  savePrompts(prompts);
  renderPrompts();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  if (!title || !content) return;

  const prompts = getPrompts();
  prompts.unshift({
    id: crypto.randomUUID(),
    title,
    content,
    createdAt: Date.now(),
  });

  savePrompts(prompts);
  renderPrompts();
  form.reset();
  titleInput.focus();
});

renderPrompts();
