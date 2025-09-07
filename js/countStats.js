const proxyUrl = "https://red-lotus.bloxyhdd.workers.dev//?url=";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function getCountUp(id, start = 0, opts = {}) {
  if (window.CountUp) {
    const c = new window.CountUp(id, start, { duration: 2, separator: ",", ...opts });
    return c;
  }
  return {
    update: (val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = Number(val).toLocaleString();
    },
  };
}

async function getGameData(universeId) {
  try {
    const apiUrl = `https://games.roblox.com/v1/games?universeIds=${universeId}`;
    const response = await fetch(proxyUrl + encodeURIComponent(apiUrl));
    if (response.ok) {
      const json = await response.json();
      const game = json.data?.[0];
      return {
        playing: game?.playing || 0,
        visits: game?.visits || 0,
      };
    } else if (response.status === 429) {
      await wait(500);
      return getGameData(universeId);
    }
  } catch (err) {
    console.error("Error fetching game data:", err);
  }
  return { playing: 0, visits: 0 };
}

async function getVotes(universeId) {
  try {
    const apiUrl = `https://games.roblox.com/v1/games/votes?universeIds=${universeId}`;
    const res = await fetch(proxyUrl + encodeURIComponent(apiUrl));
    const json = await res.json();
    const v = json?.data?.[0];
    return { up: v?.upVotes || 0, down: v?.downVotes || 0 };
  } catch {
    return { up: 0, down: 0 };
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function updateStats() {
  const ids = Array.isArray(window.gameIds) ? window.gameIds : [];
  if (ids.length === 0) return;

  const playerCounter = getCountUp("player-count", 0);
  const visitsCounter = getCountUp("visits-count", 0);

  let totalPlayers = 0;
  let totalVisits = 0;

  const results = await Promise.all(
    ids.map(async (id) => {
      const [game, votes] = await Promise.all([getGameData(id), getVotes(id)]);
      totalPlayers += game.playing;
      totalVisits += game.visits;
    })
  );

  playerCounter.update(totalPlayers);
  visitsCounter.update(totalVisits);

  setText("games-created", ids.length.toString());

  setText("hero-players", totalPlayers.toLocaleString());
  setText("hero-games", `${ids.length}+`);
}

updateStats();
