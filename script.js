const STORAGE_KEY = "promptLibrary.prompts";

const form = document.getElementById("prompt-form");
const titleInput = document.getElementById("prompt-title");
const contentInput = document.getElementById("prompt-content");
const promptList = document.getElementById("prompt-list");
const exportBtn = document.getElementById("export-btn");

function getPrompts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function createRatingStars(promptId, currentRating) {
  const container = document.createElement('div');
  container.className = 'rating-stars';
  
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.className = `star ${i <= currentRating ? 'filled' : ''}`;
    star.textContent = '★';
    star.dataset.rating = i;
    star.addEventListener('click', () => setRating(promptId, i));
    container.appendChild(star);
  }
  
  return container;
}

function setRating(promptId, rating) {
  const prompts = getPrompts();
  const prompt = prompts.find(p => p.id === promptId);
  if (prompt) {
    prompt.rating = rating;
    savePrompts(prompts);
    renderPrompts();
  }
}

function previewText(text, wordLimit = 12) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= wordLimit) {
    return words.join(" ");
  }
  return `${words.slice(0, wordLimit).join(" ")}...`;
}

function renderPrompts() {
  const prompts = getPrompts();
  promptList.innerHTML = "";

  if (prompts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No prompts saved yet.";
    promptList.appendChild(empty);
    return;
  }

  prompts.forEach((prompt, index) => {
    const card = document.createElement("article");
    card.className = "prompt-card";

    const title = document.createElement("h3");
    title.textContent = prompt.title;

    const preview = document.createElement("p");
    preview.textContent = previewText(prompt.content);

    const ratingContainer = createRatingStars(prompt.id, prompt.rating || 0);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      const updated = getPrompts().filter((p) => p.id !== prompt.id);
      savePrompts(updated);
      renderPrompts();
    });

    card.append(title, preview, ratingContainer, deleteBtn);
    promptList.appendChild(card);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title || !content) {
    return;
  }

  const prompts = getPrompts();
  const newPrompt = {
    id: `prompt-${Date.now()}`,
    title,
    content,
    rating: 0
  };
  prompts.unshift(newPrompt);
  savePrompts(prompts);

  form.reset();
  renderPrompts();
});

exportBtn.addEventListener("click", exportPrompts);

renderPrompts();
