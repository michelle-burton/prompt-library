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
      <div class="card-footer">
        <button class="delete-btn" data-id="${prompt.id}">Delete</button>
      </div>
    `;
    promptList.appendChild(card);
  });

  promptList.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => deletePrompt(btn.dataset.id));
  });
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
