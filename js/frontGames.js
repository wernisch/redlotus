const rawJsonUrl = "https://raw.githubusercontent.com/wernisch/red-lotus-stats/main/public/games.json";

function truncateGameName(name) {
  return name && name.length > 40 ? name.substring(0, 40) + "…" : name || "";
}

async function fetchJsonWithRetry(url, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (i < attempts) await new Promise(r => setTimeout(r, 250 * i));
    }
  }
  throw lastErr;
}

async function getGamesData() {
  try {
    const data = await fetchJsonWithRetry(rawJsonUrl);
    const games = Array.isArray(data?.games) ? data.games : [];

    const cleaned = games
      .map(g => ({
        id: g.id,
        rootPlaceId: g.rootPlaceId,
        name: g.name || "Untitled",
        playing: Number(g.playing) || 0,
        visits: Number(g.visits) || 0,
        icon: g.icon || (g.rootPlaceId
          ? `https://www.roblox.com/asset-thumbnail/image?assetId=${g.rootPlaceId}&width=768&height=432`
          : "")
      }))
      .filter(g => g && g.id && g.rootPlaceId);

    cleaned.sort((a, b) => b.playing - a.playing);
    return cleaned.slice(0, 5);
  } catch (err) {
    console.error("[frontGames] failed to load raw games.json:", err);
    return [];
  }
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
