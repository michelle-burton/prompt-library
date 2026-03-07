const STORAGE_KEY = "promptLibrary.prompts";

const form = document.getElementById("prompt-form");
const titleInput = document.getElementById("prompt-title");
const contentInput = document.getElementById("prompt-content");
const promptList = document.getElementById("prompt-list");

function getPrompts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePrompts(prompts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
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

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      const updated = getPrompts().filter((_, i) => i !== index);
      savePrompts(updated);
      renderPrompts();
    });

    card.append(title, preview, deleteBtn);
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
  prompts.unshift({ title, content });
  savePrompts(prompts);

  form.reset();
  renderPrompts();
});

renderPrompts();
