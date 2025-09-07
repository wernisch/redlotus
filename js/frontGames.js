const proxyUrl = "https://red-lotus.bloxyhdd.workers.dev/?url=";

function truncateGameName(name) {
  return name && name.length > 40 ? name.substring(0, 40) + "…" : name || "";
}

async function fetchThumbsBatch(universeIds) {
  if (!universeIds.length) return {};
  const url =
    "https://thumbnails.roblox.com/v1/games/multiget/thumbnails?" +
    "size=768x432&format=Png&isCircular=false&universeIds=" +
    encodeURIComponent(universeIds.join(","));
  try {
    const res = await fetch(proxyUrl + encodeURIComponent(url));
    const json = await res.json();
    const map = {};
    for (const row of json?.data || []) {
      const uId = row?.universeId;
      const img = row?.thumbnails?.[0]?.imageUrl || null;
      if (uId) map[uId] = img;
    }
    return map;
  } catch (e) {
    console.error("thumbnail multiget failed:", e);
    return {};
  }
}

async function getGamesData() {
  const ids = Array.isArray(window.gameIds) ? window.gameIds : [];
  if (!ids.length) {
    console.warn("[frontGames] window.gameIds is missing or empty.");
    return [];
  }

  const thumbMap = await fetchThumbsBatch(ids);

  const games = [];
  await Promise.all(
    ids.map(async (id) => {
      try {
        const gameRes = await fetch(
          proxyUrl + encodeURIComponent(`https://games.roblox.com/v1/games?universeIds=${id}`)
        );
        if (!gameRes.ok) throw new Error(`games api ${gameRes.status}`);
        const gameJson = await gameRes.json();
        const game = gameJson?.data?.[0];
        if (!game) return;

        games.push({
          id: game.id,
          rootPlaceId: game.rootPlaceId,
          name: game.name,
          playing: game.playing || 0,
          visits: game.visits || 0,
          icon:
            thumbMap[game.id] ||
            `https://www.roblox.com/asset-thumbnail/image?assetId=${game.rootPlaceId}&width=768&height=432`,
        });
      } catch (err) {
        console.error("Failed to load data for:", id, err);
      }
    })
  );

  games.sort((a, b) => (b.playing || 0) - (a.playing || 0));
  return games.slice(0, 5);
}

function renderCarousel(slides) {
  const inner = document.getElementById("carouselInner");
  if (!inner) return;

  inner.innerHTML = "";
  if (!slides.length) {
    inner.innerHTML =
      `<div class="w-full p-8 text-center text-gray-400">No games to show right now.</div>`;
    return;
  }

  inner.style.width = `${slides.length * 100}%`;
  inner.style.display = "flex";
  inner.style.transform = "translateX(0)";
  inner.style.willChange = "transform";

  slides.forEach((g) => {
    const slide = document.createElement("div");
    slide.className = "w-full flex-shrink-0 relative";
    slide.innerHTML = `
      <div class="relative h-72 md:h-96 overflow-hidden rounded-2xl border border-red-900/30">
        <img src="${g.icon}" alt="${g.name}" class="w-full h-full object-cover">
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
        <div class="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between gap-4">
          <div>
            <h3 class="text-2xl font-bold">${truncateGameName(g.name)}</h3>
            <p class="text-sm text-gray-300 mt-1">
              🟢 ${g.playing.toLocaleString()} playing &nbsp;|&nbsp; 👁️ ${g.visits.toLocaleString()} visits
            </p>
          </div>
          <a href="https://www.roblox.com/games/${g.rootPlaceId}" target="_blank" rel="noopener noreferrer"
             class="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md font-semibold whitespace-nowrap">
            Play Now
          </a>
        </div>
      </div>
    `;
    inner.appendChild(slide);
  });

  const prev = document.getElementById("prevSlide");
  const next = document.getElementById("nextSlide");
  let index = 0;

  function apply() {
    inner.style.transform = `translateX(-${index * (100 / slides.length)}%)`;
  }
  function go(delta) {
    index = (index + delta + slides.length) % slides.length;
    apply();
  }

  prev?.addEventListener("click", () => go(-1));
  next?.addEventListener("click", () => go(1));

  let timer = setInterval(() => go(1), 6000);
  const wrapper = document.getElementById("carouselWrapper");
  wrapper?.addEventListener("mouseenter", () => clearInterval(timer));
  wrapper?.addEventListener("mouseleave", () => (timer = setInterval(() => go(1), 6000)));
}

async function initFeatured() {
  try {
    const top = await getGamesData();
    renderCarousel(top);
  } catch (e) {
    console.error("[frontGames] init error:", e);
  }
}

initFeatured();

