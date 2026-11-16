const STORAGE_KEY = "lostFoundItems";

let items = [];

const form = document.getElementById("item-form");
const list = document.getElementById("list");
const message = document.getElementById("message");
const count = document.getElementById("count");
const search = document.getElementById("search");
const filter = document.getElementById("filter");
const hideClaimed = document.getElementById("hide-claimed");

// 1. Load data: saved items first, otherwise data.json
async function loadItems() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    items = JSON.parse(saved);
    return;
  }
  try {
    const response = await fetch("data.json");
    const data = await response.json();
    items = data.items;
    saveItems();
  } catch (error) {
    items = [];
    message.textContent =
      "Could not load data.json. Open this project with the Live Server extension in VS Code.";
  }
}

function saveItems() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    alert("Storage is full. Delete some posts or use smaller photos.");
  }
}

// Shrink the photo so it fits in localStorage
function resizeImage(file, maxSize = 600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// 2. Show items on the page
function render() {
  const text = search.value.trim().toLowerCase();
  const category = filter.value;

  const visible = items.filter((item) => {
    const matchesText = [item.name, item.description, item.location]
      .join(" ")
      .toLowerCase()
      .includes(text);
    const matchesCategory = category === "All" || item.category === category;
    const matchesClaimed = !(hideClaimed.checked && item.claimed);
    return matchesText && matchesCategory && matchesClaimed;
  });

  list.innerHTML = "";
  count.textContent = "(" + visible.length + ")";

  visible.forEach((item) => {
    const card = document.createElement("article");
    card.className = "item" + (item.claimed ? " claimed" : "");

    if (item.image) {
      const photo = document.createElement("img");
      photo.className = "photo";
      photo.src = item.image;
      photo.alt = "Photo of " + item.name;
      card.appendChild(photo);
    }

    const title = document.createElement("h3");
    title.textContent = item.name;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = item.claimed ? "Claimed" : item.category;

    const desc = document.createElement("p");
    desc.textContent = item.description;

    const where = document.createElement("p");
    where.className = "meta";
    where.textContent = "Found at " + item.location + " on " + formatDate(item.date);

    const contact = document.createElement("p");
    contact.className = "meta";
    contact.textContent = "Contact " + item.finder + ": " + item.contact;

    const actions = document.createElement("div");
    actions.className = "actions";

    const claimBtn = document.createElement("button");
    claimBtn.textContent = item.claimed ? "Mark as unclaimed" : "Mark as claimed";
    claimBtn.addEventListener("click", () => toggleClaimed(item.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteItem(item.id));

    actions.append(claimBtn, deleteBtn);
    card.append(title, badge, desc, where, contact, actions);
    list.appendChild(card);
  });

  if (visible.length === 0 && !message.textContent.startsWith("Could not")) {
    message.textContent = "No items match. Try a different search or post a found item.";
  } else if (visible.length > 0) {
    message.textContent = "";
  }
}

function formatDate(value) {
  const date = new Date(value + "T00:00:00");
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// 3. Actions
function toggleClaimed(id) {
  const item = items.find((i) => i.id === id);
  item.claimed = !item.claimed;
  saveItems();
  render();
}

function deleteItem(id) {
  if (!confirm("Delete this post?")) return;
  items = items.filter((i) => i.id !== id);
  saveItems();
  render();
}

const photoInput = document.getElementById("photo");
const preview = document.getElementById("preview");

photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];
  if (!file) {
    preview.hidden = true;
    return;
  }
  preview.src = await resizeImage(file);
  preview.hidden = false;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = photoInput.files[0];
  const image = file ? await resizeImage(file) : "";
  const newItem = {
    id: Date.now(),
    name: document.getElementById("name").value.trim(),
    category: document.getElementById("category").value,
    description: document.getElementById("description").value.trim(),
    location: document.getElementById("location").value.trim(),
    date: document.getElementById("date").value,
    finder: document.getElementById("finder").value.trim(),
    contact: document.getElementById("contact").value.trim(),
    image: image,
    claimed: false
  };
  items.unshift(newItem);
  saveItems();
  form.reset();
  preview.hidden = true;
  document.getElementById("date").value = today();
  render();
});

[search, filter, hideClaimed].forEach((el) => el.addEventListener("input", render));

function today() {
  return new Date().toISOString().split("T")[0];
}

// 4. Start
document.getElementById("date").value = today();
loadItems().then(render);

// 5. Make the site installable as an app (PWA)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}
