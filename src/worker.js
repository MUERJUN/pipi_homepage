export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/api/steam" && request.method === "GET") {
      return handleSteam(env);
    }

    if (url.pathname === "/api/messages" && request.method === "GET") {
      return handleGetMessages(env);
    }

    if (url.pathname === "/api/messages" && request.method === "POST") {
      return handlePostMessage(request, env);
    }

    if (url.pathname === "/api/scores" && request.method === "GET") {
      return handleGetScores(env);
    }

    if (url.pathname === "/api/scores" && request.method === "POST") {
      return handlePostScore(request, env);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders()
    });
  }
};

async function handleSteam(env) {
  try {
    const steamId = env.STEAM_ID;
    const key = env.STEAM_API_KEY;

    if (!steamId) {
      return json({ error: "STEAM_ID 未配置" }, 500);
    }

    if (!key) {
      return json({ error: "STEAM_API_KEY 未配置" }, 500);
    }

    const profileUrl =
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/` +
      `?key=${encodeURIComponent(key)}` +
      `&steamids=${encodeURIComponent(steamId)}`;

    const recentUrl =
      `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/` +
      `?key=${encodeURIComponent(key)}` +
      `&steamid=${encodeURIComponent(steamId)}` +
      `&count=5`;

    const ownedUrl =
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/` +
      `?key=${encodeURIComponent(key)}` +
      `&steamid=${encodeURIComponent(steamId)}` +
      `&include_appinfo=true` +
      `&include_played_free_games=true`;

    const [profileResp, recentResp, ownedResp] = await Promise.all([
      fetch(profileUrl),
      fetch(recentUrl),
      fetch(ownedUrl)
    ]);

    const profileData = await profileResp.json().catch(() => ({}));
    const recentData = await recentResp.json().catch(() => ({}));
    const ownedData = await ownedResp.json().catch(() => ({}));

    if (!profileResp.ok) {
      return json({ error: "Steam 个人资料请求失败" }, profileResp.status);
    }

    const player = profileData?.response?.players?.[0] || null;

    const recentGames = Array.isArray(recentData?.response?.games)
      ? recentData.response.games
      : [];

    const ownedGames = Array.isArray(ownedData?.response?.games)
      ? ownedData.response.games
      : [];

    const totalMinutes = ownedGames.reduce((sum, game) => {
      return sum + Number(game.playtime_forever || 0);
    }, 0);

    const topGames = [...ownedGames]
      .sort((a, b) => {
        return Number(b.playtime_forever || 0) - Number(a.playtime_forever || 0);
      })
      .slice(0, 6)
      .map(formatSteamGame);

    return json({
      profile: player
        ? {
            name: player.personaname || "Unknown",
            avatar:
              player.avatarfull ||
              player.avatarmedium ||
              player.avatar ||
              "",
            profileUrl:
              player.profileurl ||
              `https://steamcommunity.com/profiles/${steamId}/`,
            status: steamStatus(player.personastate)
          }
        : {
            name: "Steam Profile",
            avatar: "",
            profileUrl: `https://steamcommunity.com/profiles/${steamId}/`,
            status: "Unknown"
          },
      summary: {
        gameCount: Number(
          ownedData?.response?.game_count ||
          ownedGames.length ||
          0
        ),
        totalHours: Math.round((totalMinutes / 60) * 10) / 10
      },
      recent: recentGames.map(formatSteamGame),
      topGames
    });
  } catch (err) {
    return json({ error: err.message || "Steam 信息加载失败" }, 500);
  }
}

function formatSteamGame(game) {
  const appid = game.appid;

  return {
    appid,
    name: game.name || "Unknown Game",
    hours:
      Math.round((Number(game.playtime_forever || 0) / 60) * 10) / 10,
    hours2Weeks:
      Math.round((Number(game.playtime_2weeks || 0) / 60) * 10) / 10,
    icon:
      appid && game.img_icon_url
        ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${game.img_icon_url}.jpg`
        : ""
  };
}

function steamStatus(state) {
  const map = {
    0: "Offline",
    1: "Online",
    2: "Busy",
    3: "Away",
    4: "Snooze",
    5: "Looking to trade",
    6: "Looking to play"
  };

  return map[Number(state)] || "Unknown";
}

async function handleGetMessages(env) {
  try {
    checkGitHubEnv(env);

    const comments = await githubRequest(
      env,
      `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues/${env.GUESTBOOK_ISSUE_NUMBER}/comments?per_page=80`
    );

    const messages = comments
      .map(parseGuestbookComment)
      .filter(Boolean)
      .reverse();

    return json({ messages });
  } catch (err) {
    return json({ error: err.message || "留言加载失败" }, 500);
  }
}

async function handlePostMessage(request, env) {
  try {
    checkGitHubEnv(env);

    const body = await request.json().catch(() => ({}));

    const name = sanitizeText(body.name || "匿名访客", 20);
    const content = sanitizeText(body.content || "", 200);

    if (!content) {
      return json({ error: "留言不能为空" }, 400);
    }

    const payload = {
      name,
      content,
      time: new Date().toISOString()
    };

    const commentBody =
      "```guestbook\n" +
      JSON.stringify(payload) +
      "\n```";

    await githubRequest(
      env,
      `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues/${env.GUESTBOOK_ISSUE_NUMBER}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ body: commentBody })
      }
    );

    return json({ ok: true });
  } catch (err) {
    return json({ error: err.message || "留言发送失败" }, 500);
  }
}

async function handleGetScores(env) {
  try {
    checkGitHubEnv(env);

    const comments = await githubRequest(
      env,
      `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues/${env.GUESTBOOK_ISSUE_NUMBER}/comments?per_page=100`
    );

    const scores = comments
      .map(parseTetrisScoreComment)
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, 10);

    return json({ scores });
  } catch (err) {
    return json({ error: err.message || "排行榜加载失败" }, 500);
  }
}

async function handlePostScore(request, env) {
  try {
    checkGitHubEnv(env);

    const body = await request.json().catch(() => ({}));
    const name = sanitizeText(body.name || "匿名玩家", 20);
    const score = Math.floor(Number(body.score || 0));

    if (!Number.isFinite(score) || score <= 0) {
      return json({ error: "分数不太对" }, 400);
    }

    const payload = {
      name,
      score: Math.min(score, 999999),
      time: new Date().toISOString()
    };

    const commentBody =
      "```tetris-score\n" +
      JSON.stringify(payload) +
      "\n```";

    await githubRequest(
      env,
      `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues/${env.GUESTBOOK_ISSUE_NUMBER}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ body: commentBody })
      }
    );

    return json({ ok: true });
  } catch (err) {
    return json({ error: err.message || "分数上传失败" }, 500);
  }
}

function checkGitHubEnv(env) {
  if (!env.GITHUB_OWNER) {
    throw new Error("GITHUB_OWNER 未配置");
  }

  if (!env.GITHUB_REPO) {
    throw new Error("GITHUB_REPO 未配置");
  }

  if (!env.GUESTBOOK_ISSUE_NUMBER) {
    throw new Error("GUESTBOOK_ISSUE_NUMBER 未配置");
  }

  if (!env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN 未配置");
  }
}

async function githubRequest(env, path, options = {}) {
  const resp = await fetch(`https://api.github.com${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "pipi-homepage-worker",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    },
    body: options.body
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    throw new Error(data?.message || `GitHub API 请求失败：${resp.status}`);
  }

  return data;
}

function parseGuestbookComment(comment) {
  const body = String(comment.body || "");
  const match = body.match(/```guestbook\s*([\s\S]*?)\s*```/);

  if (!match) return null;

  try {
    const data = JSON.parse(match[1]);

    return {
      id: comment.id,
      name: sanitizeText(data.name || "匿名访客", 20),
      content: sanitizeText(data.content || "", 200),
      createdAt: data.time || comment.created_at
    };
  } catch {
    return null;
  }
}

function parseTetrisScoreComment(comment) {
  const body = String(comment.body || "");
  const match = body.match(/```tetris-score\s*([\s\S]*?)\s*```/);

  if (!match) return null;

  try {
    const data = JSON.parse(match[1]);
    const score = Math.floor(Number(data.score || 0));

    if (!score || score <= 0) return null;

    return {
      id: comment.id,
      name: sanitizeText(data.name || "匿名玩家", 20),
      score,
      createdAt: data.time || comment.created_at
    };
  } catch {
    return null;
  }
}

function sanitizeText(value, maxLength) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      ...corsHeaders()
    }
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
