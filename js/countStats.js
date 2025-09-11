const rawJsonUrl = "https://raw.githubusercontent.com/wernisch/red-lotus-stats/refs/heads/main/public/games.json";

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

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function updateStats() {
  try {
    const res = await fetch(rawJsonUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const games = json.games || [];

    const playerCounter = getCountUp("player-count", 0);
    const visitsCounter = getCountUp("visits-count", 0);

    let totalPlayers = 0;
    let totalVisits = 0;

    for (const game of games) {
      totalPlayers += game.playing || 0;
      totalVisits += game.visits || 0;
    }

    playerCounter.update(totalPlayers);
    visitsCounter.update(totalVisits);

    setText("games-created", games.length.toString());
    setText("hero-players", totalPlayers.toLocaleString());
    setText("hero-games", `${games.length}+`);
  } catch (err) {
    console.error("Error fetching stats:", err);
  }
}

updateStats();
