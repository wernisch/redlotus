const proxyUrl = "https://red-lotus.bloxyhdd.workers.dev/?url=";

const gamesContainer = document.getElementById("games-container");
const loadingElement = document.getElementById("loading");
const noResultsElement = document.getElementById("no-results");
const searchInput = document.getElementById("game-search");
const gameCountElement = document.getElementById("game-count");

function safeJSON(res) {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function calculateLikeRatio(up = 0, down = 0) {
  const total = up + down;
  return total > 0 ? Math.round((up / total) * 100) : 0;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchThumbsBatch(universeIds) {
  if (!universeIds.length) return {};
  const CHUNK = 50;
  const chunks = chunk(universeIds, CHUNK);
  const map = {};

  await Promise.all(
    chunks.map(async (ids) => {
      const url =
        "https://thumbnails.roblox.com/v1/games/multiget/thumbnails?" +
        "size=768x432&format=Png&isCircular=false&universeIds=" +
        encodeURIComponent(ids.join(","));
      try {
        const res = await fetch(proxyUrl + encodeURIComponent(url));
        const json = await safeJSON(res);
        for (const row of json?.data || []) {
          const uId = row?.universeId;
          const img = row?.thumbnails?.[0]?.imageUrl || null;
          if (uId) map[uId] = img;
        }
      } catch (e) {
        console.error("[thumbs] failed for chunk:", ids, e);
      }
    })
  );

  return map;
}

async function fetchGameData(universeId) {
  const url = `https://games.roblox.com/v1/games?universeIds=${universeId}`;
  const res = await fetch(proxyUrl + encodeURIComponent(url));
  const data = await safeJSON(res);
  return data?.data?.[0] || null;
}

async function fetchGameVotes(universeId) {
  const url = `https://games.roblox.com/v1/games/votes?universeIds=${universeId}`;
  const res = await fetch(proxyUrl + encodeURIComponent(url));
  const data = await safeJSON(res);
  return data?.data?.[0] || null;
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
    const ratio = calculateLikeRatio(game.upVotes, game.downVotes);
    const delay = i * 80;

    const card = document.createElement("div");
    card.className = "lotus-card group h-full flex flex-col";
    card.setAttribute("data-aos", "fade-up");
    card.setAttribute("data-aos-delay", String(delay));

    card.innerHTML = `
      <div class="relative overflow-hidden rounded-xl">
        <img
          src="${game.icon}"
          alt="${game.name}"
          class="w-full h-56 object-cover"
          loading="lazy"
        >
        <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
        <div class="absolute bottom-0 left-0 p-4">
          <h3 class="text-lg font-bold text-white">${game.name}</h3>
          <div class="flex items-center mt-1 text-sm">
            <div class="flex items-center" title="${game.upVotes || 0} 👍 / ${game.downVotes || 0} 👎">
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
    const ids = Array.isArray(window.gameIds) ? window.gameIds : [];
    if (!ids.length) {
      console.warn("[games] window.gameIds missing or empty");
      loadingElement?.classList.add("hidden");
      noResultsElement?.classList.remove("hidden");
      if (gameCountElement) gameCountElement.textContent = "0 games";
      return;
    }

    const thumbMap = await fetchThumbsBatch(ids);

    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const [info, votes] = await Promise.all([
            fetchGameData(id),
            fetchGameVotes(id),
          ]);
          if (!info) return null;

          return {
            id: info.id,
            rootPlaceId: info.rootPlaceId,
            name: info.name,
            description: info.description,
            playing: info.playing || 0,
            visits: info.visits || 0,
            upVotes: votes?.upVotes || 0,
            downVotes: votes?.downVotes || 0,
            icon:
              thumbMap[info.id] ||
              `https://www.roblox.com/asset-thumbnail/image?assetId=${info.rootPlaceId}&width=768&height=432`,
          };
        } catch (e) {
          console.error("[games] failed for", id, e);
          return null;
        }
      })
    );

    const valid = results.filter(Boolean);
    const sorted = valid.sort((a, b) => (b.playing || 0) - (a.playing || 0));

    renderGames(sorted);

    // Search
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

