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
      <div class="card-footer">
        <button class="delete-btn" data-id="${prompt.id}">Delete</button>
      </div>
    `;
    promptList.appendChild(card);
  });

  promptList.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => deletePrompt(btn.dataset.id));
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
