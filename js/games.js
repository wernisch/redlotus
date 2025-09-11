const rawJsonUrl = "https://raw.githubusercontent.com/wernisch/red-lotus-stats/refs/heads/main/public/games.json";

const gamesContainer = document.getElementById("games-container");
const loadingElement = document.getElementById("loading");
const noResultsElement = document.getElementById("no-results");
const searchInput = document.getElementById("game-search");
const gameCountElement = document.getElementById("game-count");

function safeJSON(res) {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJsonWithRetry(url, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      return await safeJSON(res);
    } catch (e) {
      lastErr = e;
      if (i < attempts) await sleep(250 * i);
    }
  }
  throw lastErr;
}

function getLikeRatio(game) {
  if (typeof game.likeRatio === "number") return game.likeRatio;
  const up = Number(game.upVotes || 0);
  const down = Number(game.downVotes || 0);
  const total = up + down;
  return total > 0 ? Math.round((up / total) * 100) : 0;
}

function renderGames(games) {
  if (!gamesContainer) return;
  gamesContainer.innerHTML = "";

  if (!games.length) {
    noResultsElement?.classList.remove("hidden");
    if (gameCountElement) gameCountElement.textContent = "0 games";
    return;
  }

  noResultsElement?.classList.add("hidden");
  if (gameCountElement) gameCountElement.textContent = `${games.length} ${games.length === 1 ? "game" : "games"}`;

  games.forEach((game, i) => {
    const ratio = getLikeRatio(game);
    const delay = i * 80;

    const card = document.createElement("div");
    card.className = "lotus-card group h-full flex flex-col";
    card.setAttribute("data-aos", "fade-up");
    card.setAttribute("data-aos-delay", String(delay));

    const icon =
      game.icon ||
      (game.rootPlaceId
        ? `https://www.roblox.com/asset-thumbnail/image?assetId=${game.rootPlaceId}&width=768&height=432`
        : "");

    card.innerHTML = `
      <div class="relative overflow-hidden rounded-xl">
        <img
          src="${icon}"
          alt="${game.name || "Game"}"
          class="w-full h-56 object-cover"
          loading="lazy"
        >
        <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
        <div class="absolute bottom-0 left-0 p-4">
          <h3 class="text-lg font-bold text-white">${game.name || "Untitled"}</h3>
          <div class="flex items-center mt-1 text-sm">
            <div class="flex items-center" title="${ratio}% likes">
              <i class="fas fa-thumbs-up text-green-400 mr-1"></i>
              <span class="text-white">${ratio}%</span>
            </div>
            <span class="mx-2 text-gray-400">|</span>
            <span class="text-red-300">${(game.visits || 0).toLocaleString()} visits</span>
          </div>
        </div>
      </div>

      <div class="p-4">
        <div class="mt-1 flex justify-between items-center text-sm">
          <span class="text-green-400">
            <span class="font-semibold">${(game.playing || 0).toLocaleString()}</span> playing now
          </span>
          <a
            href="https://www.roblox.com/games/${game.rootPlaceId}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 transition text-white font-semibold"
          >
            Play
          </a>
        </div>
      </div>
    `;

    gamesContainer.appendChild(card);
  });

  if (window.AOS?.refresh) {
    try { window.AOS.refresh(); } catch {}
  }
}

function filterGames(games, term) {
  const t = term.trim().toLowerCase();
  if (!t) return games;
  return games.filter((g) =>
    (g.name || "").toLowerCase().includes(t) ||
    (g.description || "").toLowerCase().includes(t)
  );
}

async function loadGames() {
  loadingElement?.classList.remove("hidden");

  try {
    const data = await fetchJsonWithRetry(rawJsonUrl);
    const list = Array.isArray(data?.games) ? data.games : [];

    const normalized = list.map(g => ({
      id: g.id,
      rootPlaceId: g.rootPlaceId,
      name: g.name || "Untitled",
      description: g.description || "",
      playing: Number(g.playing) || 0,
      visits: Number(g.visits) || 0,
      likeRatio: typeof g.likeRatio === "number" ? g.likeRatio : undefined,
      upVotes: g.upVotes,
      downVotes: g.downVotes,
      icon: g.icon || ""
    }));

    const sorted = normalized.sort((a, b) => b.playing - a.playing);

    renderGames(sorted);

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const filtered = filterGames(sorted, searchInput.value);
        renderGames(filtered);
      });
    }
  } catch (err) {
    console.error("Failed to load games:", err);
    if (noResultsElement) {
      noResultsElement.classList.remove("hidden");
      noResultsElement.innerHTML = `
        <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
        <h3 class="text-xl font-medium text-gray-300">Error loading games</h3>
        <p class="mt-2 text-gray-500">Please try again later</p>
      `;
    }
  } finally {
    loadingElement?.classList.add("hidden");
  }
}

loadGames();

