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

  games.forEach((game, index) => {
    const ratio = getLikeRatio(game);
    const delay = index < 4 ? (index * 150) + 100 : 100;

    const cardWrap = document.createElement("div");
    cardWrap.setAttribute("data-aos", "fade-up");
    cardWrap.setAttribute("data-aos-delay", String(delay));

    const icon =
      game.icon ||
      (game.rootPlaceId
        ? `https://www.roblox.com/asset-thumbnail/image?assetId=${game.rootPlaceId}&width=768&height=432`
        : "");

    cardWrap.innerHTML = `
<div class="group h-full flex flex-col rounded-xl overflow-hidden border border-[#ff0000]/40 bg-neutral-900/70
            shadow-[0_0_8px_#ff0000] hover:shadow-[0_0_16px_#ff0000] transition">
  <div class="relative bg-black aspect-[16/9]">
    <img
      class="absolute inset-0 w-full h-full object-contain"
      src="${icon}"
      alt="${game.name || "Game"}"
      loading="lazy"
    >

    <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none"></div>

    <div class="absolute bottom-0 left-0 p-4 pointer-events-none">
      <h3 class="text-xl font-bold text-white">${game.name || "Untitled"}</h3>
      <div class="flex items-center mt-1 text-sm gap-2">
        <span class="flex items-center text-green-400 font-bold">
          <svg
            class="w-6 h-6 mr-1 text-green-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="9" cy="7" r="3.5"></circle>
            <path d="M3.5 18.5c0-3 2.7-5.5 5.5-5.5s5.5 2.5 5.5 5.5"></path>
            <circle cx="17" cy="9" r="2.5"></circle>
            <path d="M14.5 18.5c0-2.2 2-4 4-4s4 1.8 4 4"></path>
          </svg>
          <span class="text-white"><span class="font-semibold">${(game.playing || 0).toLocaleString()}</span> playing</span>
        </span>

        <span class="text-gray-400">|</span>

        <span class="flex items-center" title="${ratio}% likes">
          <i class="fas fa-thumbs-up text-green-400 mr-1"></i>
          <span class="text-white font-semibold">${ratio}%</span>
        </span>

        <span class="text-gray-400">|</span>

        <span class="text-white font-semibold">${(game.visits || 0).toLocaleString()} visits</span>
      </div>
    </div>

    <a
      href="https://www.roblox.com/games/${game.rootPlaceId}"
      target="_blank" rel="noopener noreferrer"
      class="absolute bottom-0 right-0 m-4 inline-flex items-center justify-center px-5 py-2 rounded-md bg-[#ff0000] hover:bg-[#e60000] text-white font-semibold text-sm transition w-32 border-2 border-black shadow-[0_2px_0_#000] pointer-events-auto"
    >
      Play Now
    </a>
  </div>
</div>
    `;

    gamesContainer.appendChild(cardWrap);
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
          <i class="fas fa-exclamation-triangle text-4xl text-lotus mb-4"></i>
          <h3 class="text-xl font-medium text-gray-300">Error loading games</h3>
          <p class="mt-2 text-gray-500">Please try again later</p>
        `;
    }
  } finally {
    loadingElement?.classList.add("hidden");
  }
}

loadGames();
