const $ = (selector) => document.querySelector(selector);

const state = {
  reactionTimer: null,
  reactionStart: 0,
  reactionArmed: false,
  logoClicks: 0,
  lastTetrisScore: 0,
  tetrisSubmitted: false,
};

const cards = [
  { rarity: "N", title: "正常开机", text: "今天正常开机" },
  { rarity: "N", title: "能跑就行", text: "能跑已经很给面子了......" },
  { rarity: "R", title: "低电量", text: "有点虚，但不是不能用。" },
  { rarity: "R", title: "何意味？", text: "？味意何" },
  { rarity: "R", title: "别问", text: "问就是还没做完。" },
  { rarity: "SR", title: "看啥呢", text: "来都来了，点两下再走。" },
  { rarity: "SR", title: "干净混乱", text: "还行吧" },
  { rarity: "SR", title: "施工中", text: "不是没做完，是正在生成。" },
  { rarity: "SSR", title: "网页活着", text: "管你这的那的，先来给我炒个菜。" },
  { rarity: "SSR", title: "系统正常", text: "系统不正常。" },
  { rarity: "UR", title: "没死呢", text: "没死呢，别想吃席了。" },
  { rarity: "UR", title: "不解释", text: "今天不解释，直接跳过。" },
];

init();

function init() {
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  setupReveal();
  setupSecret();
  setupDraw();
  setupReaction();
  setupGuestbook();
  setupTetris();

  loadSteam();
  loadMessages();
  loadTetrisScores();
}

function setupReveal() {
  const items = document.querySelectorAll(".reveal");

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.16 }
  );

  items.forEach((item) => observer.observe(item));
}

function setupSecret() {
  const brand = $(".profile-brand");

  if (!brand) return;

  brand.addEventListener("click", () => {
    state.logoClicks += 1;

    if (state.logoClicks >= 5) {
      document.body.classList.toggle("secret-mode");
      state.logoClicks = 0;
    }
  });
}

function setupDraw() {
  const btn = $("#drawBtn");
  const result = $("#drawResult");

  if (!btn || !result) return;

  btn.addEventListener("click", () => {
    const card = cards[Math.floor(Math.random() * cards.length)];

    result.innerHTML = `
      <small>${escapeHTML(card.rarity)}</small>
      <strong>${escapeHTML(card.title)}</strong>
      <p>${escapeHTML(card.text)}</p>
    `;
  });
}

function setupReaction() {
  const btn = $("#reactionBtn");
  const box = $("#reactionBox");

  if (!btn || !box) return;

  btn.addEventListener("click", () => {
    if (state.reactionArmed) {
      const ms = Date.now() - state.reactionStart;
      state.reactionArmed = false;
      clearTimeout(state.reactionTimer);

      box.className = "reaction-box";
      box.innerHTML = `
        <strong>${ms}ms</strong>
        <p>${reactionComment(ms)}</p>
      `;

      btn.textContent = "再来";
      return;
    }

    clearTimeout(state.reactionTimer);

    box.className = "reaction-box waiting";
    box.innerHTML = `
      <strong>等会</strong>
      <p>别急，变绿再点。</p>
    `;

    btn.textContent = "等着";
    btn.disabled = true;

    const delay = 900 + Math.floor(Math.random() * 2600);

    state.reactionTimer = setTimeout(() => {
      state.reactionArmed = true;
      state.reactionStart = Date.now();

      box.className = "reaction-box ready";
      box.innerHTML = `
        <strong>点</strong>
        <p>现在点，别愣着。</p>
      `;

      btn.textContent = "点我";
      btn.disabled = false;
    }, delay);

    box.onclick = () => {
      if (!state.reactionArmed && btn.disabled) {
        clearTimeout(state.reactionTimer);
        btn.disabled = false;
        btn.textContent = "再来";
        box.className = "reaction-box failed";
        box.innerHTML = `
          <strong>急了</strong>
          <p>你这预判有点太明显。</p>
        `;
      }
    };
  });
}

function reactionComment(ms) {
  if (ms < 180) return "你开桂了吧。";
  if (ms < 260) return "牛福，这个反应可以。";
  if (ms < 360) return "正常人类，暂时通过。";
  if (ms < 520) return "是真人吗？";
  return "什么时候混进来的？";
}

async function loadSteam() {
  try {
    const res = await fetch("/api/steam");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Steam 加载失败");
    }

    renderSteam(data);
  } catch (err) {
    setText("#steamName", "Steam 没加载出来");
    setText("#steamStatus", err.message || "未知错误");
    setText("#navSteamName", "Steam 没加载出来");
    setText("#navSteamStatus", "炸了");

    const recentGames = $("#recentGames");
    const topGames = $("#topGames");

    if (recentGames) recentGames.innerHTML = `<p class="empty">Steam 信息加载失败。</p>`;
    if (topGames) topGames.innerHTML = `<p class="empty">Steam 信息加载失败。</p>`;
  }
}

function renderSteam(data) {
  const profile = data.profile || {};
  const summary = data.summary || {};
  const status = translateSteamStatus(profile.status);

  setText("#steamName", profile.name || "未知玩家");
  setText("#steamStatus", status);
  setText("#steamGameCount", summary.gameCount ?? "--");

  const totalHours =
    summary.totalHours != null ? `${summary.totalHours} 小时` : "--";
  setText("#steamTotalHours", totalHours);

  setText("#navSteamName", profile.name || "未知玩家");
  setText("#navSteamStatus", status);

  const avatar = $("#steamAvatar");
  if (avatar) avatar.src = profile.avatar || "";

  const navAvatar = $("#navSteamAvatar");
  if (navAvatar) navAvatar.src = profile.avatar || "";

  const link = $("#steamProfileLink");
  if (link) {
    link.href = profile.profileUrl || "https://steamcommunity.com/";
  }

  const brand = $(".profile-brand");
  if (brand) {
    brand.href = profile.profileUrl || "#top";
    brand.target = "_blank";
  }

  renderGames("#recentGames", data.recent || [], "recent");
  renderGames("#topGames", data.topGames || [], "top");
}

function translateSteamStatus(status) {
  const map = {
    Offline: "离线",
    Online: "在线",
    Busy: "忙着",
    Away: "离开",
    Snooze: "打盹",
    "Looking to trade": "想交易",
    "Looking to play": "想开一把",
    Unknown: "未知",
  };

  return map[status] || status || "未知";
}

function renderGames(selector, games, mode) {
  const root = $(selector);
  if (!root) return;

  if (!games.length) {
    root.innerHTML = `<p class="empty">没拿到游戏数据，可能是隐私没公开。</p>`;
    return;
  }

  root.innerHTML = games
    .map((game) => {
      const hours =
        mode === "recent"
          ? `近两周 ${game.hours2Weeks || 0} 小时`
          : `总计 ${game.hours || 0} 小时`;

      return `
        <div class="game-item">
          ${
            game.icon
              ? `<img class="game-icon" src="${escapeAttr(game.icon)}" alt="">`
              : `<div class="game-icon"></div>`
          }
          <div>
            <strong>${escapeHTML(game.name)}</strong>
            <small>${escapeHTML(hours)}</small>
          </div>
        </div>
      `;
    })
    .join("");
}

function setupGuestbook() {
  const form = $("#messageForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = $("#messageName").value.trim() || "匿名访客";
    const content = $("#messageContent").value.trim();
    const btn = $("#sendMessageBtn");

    if (!content) {
      setHint("留言不能为空。", "bad");
      return;
    }

    btn.disabled = true;
    btn.textContent = "贴上去中...";
    setHint("正在贴，别连点。", "");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, content }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "发送失败");
      }

      $("#messageContent").value = "";
      setHint("贴上去了。", "ok");
      await loadMessages();
    } catch (err) {
      setHint(err.message || "留言发送失败。", "bad");
    } finally {
      btn.disabled = false;
      btn.textContent = "贴上去";
    }
  });
}

async function loadMessages() {
  try {
    const res = await fetch("/api/messages");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "留言板加载失败");
    }

    renderMessages(data.messages || []);
  } catch (err) {
    const list = $("#messageList");
    if (list) {
      list.innerHTML = `<p class="empty">留言加载失败：${escapeHTML(err.message || "未知错误")}</p>`;
    }
  }
}

function renderMessages(messages) {
  const list = $("#messageList");
  const count = $("#messageCount");

  if (count) count.textContent = String(messages.length);

  if (!list) return;

  if (!messages.length) {
    list.innerHTML = `<p class="empty">还没人贴东西。</p>`;
    return;
  }

  list.innerHTML = messages
    .map((msg) => {
      return `
        <article class="message-card">
          <div class="message-head">
            <strong>${escapeHTML(msg.name || "匿名访客")}</strong>
            <small>${formatTime(msg.createdAt)}</small>
          </div>
          <p>${escapeHTML(msg.content || "")}</p>
        </article>
      `;
    })
    .join("");
}

function setupTetris() {
  const canvas = $("#tetrisCanvas");
  const startBtn = $("#tetrisStartBtn");
  const resetBtn = $("#tetrisResetBtn");
  const submitBtn = $("#tetrisSubmitBtn");
  const scoreEl = $("#tetrisScore");
  const hint = $("#tetrisHint");

  if (!canvas || !startBtn || !resetBtn || !submitBtn || !scoreEl) return;

  const ctx = canvas.getContext("2d");
  const cols = 10;
  const rows = 15;
  const size = 16;

  let board = createBoard(rows, cols);
  let piece = null;
  let score = 0;
  let timer = null;
  let running = false;

  const shapes = [
    [[1, 1, 1, 1]],
    [[1, 1], [1, 1]],
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]],
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
  ];

  draw();

  startBtn.addEventListener("click", () => {
    if (running) return;

    running = true;
    state.tetrisSubmitted = false;
    submitBtn.disabled = true;
    if (hint) hint.textContent = "";
    if (!piece) piece = newPiece();

    timer = setInterval(tick, 420);
    startBtn.textContent = "进行中";
  });

  resetBtn.addEventListener("click", () => {
    clearInterval(timer);
    board = createBoard(rows, cols);
    piece = newPiece();
    score = 0;
    state.lastTetrisScore = 0;
    state.tetrisSubmitted = false;
    running = false;
    scoreEl.textContent = "0";
    startBtn.textContent = "开始";
    submitBtn.textContent = "记我一笔";
    submitBtn.disabled = true;
    if (hint) hint.textContent = "";
    draw();
  });

  submitBtn.addEventListener("click", async () => {
    if (!state.lastTetrisScore || state.tetrisSubmitted) return;

    const name = $("#navSteamName")?.textContent?.trim() || "匿名玩家";
    submitBtn.disabled = true;
    submitBtn.textContent = "记着...";
    if (hint) hint.textContent = "正在写排行榜。";

    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, score: state.lastTetrisScore }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "上传失败");
      }

      state.tetrisSubmitted = true;
      submitBtn.textContent = "记上了";
      if (hint) hint.textContent = "记上了。";
      await loadTetrisScores();
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = "记我一笔";
      if (hint) hint.textContent = err.message || "排行榜炸了。";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!piece) return;

    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
    }

    if (event.key === "ArrowLeft") move(-1, 0);
    if (event.key === "ArrowRight") move(1, 0);
    if (event.key === "ArrowDown") tick();
    if (event.key === "ArrowUp") rotate();
  });

  function tick() {
    if (!piece) return;

    if (!move(0, 1)) {
      mergePiece();
      clearLines();
      piece = newPiece();

      if (collides(piece.x, piece.y, piece.shape)) {
        clearInterval(timer);
        running = false;
        state.lastTetrisScore = score;
        startBtn.textContent = "寄了";
        submitBtn.disabled = score <= 0;
        if (hint) hint.textContent = score > 0 ? "要不要记一笔？" : "零分就别记了吧。";
      }
    }

    draw();
  }

  function newPiece() {
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    return {
      x: Math.floor(cols / 2) - Math.ceil(shape[0].length / 2),
      y: 0,
      shape,
      color: randomBlockColor(),
    };
  }

  function move(dx, dy) {
    const nextX = piece.x + dx;
    const nextY = piece.y + dy;

    if (!collides(nextX, nextY, piece.shape)) {
      piece.x = nextX;
      piece.y = nextY;
      draw();
      return true;
    }

    return false;
  }

  function rotate() {
    const rotated = piece.shape[0].map((_, index) =>
      piece.shape.map((row) => row[index]).reverse()
    );

    if (!collides(piece.x, piece.y, rotated)) {
      piece.shape = rotated;
      draw();
    }
  }

  function collides(x, y, shape) {
    for (let row = 0; row < shape.length; row += 1) {
      for (let col = 0; col < shape[row].length; col += 1) {
        if (!shape[row][col]) continue;

        const boardX = x + col;
        const boardY = y + row;

        if (boardX < 0 || boardX >= cols || boardY >= rows) {
          return true;
        }

        if (boardY >= 0 && board[boardY][boardX]) {
          return true;
        }
      }
    }

    return false;
  }

  function mergePiece() {
    for (let row = 0; row < piece.shape.length; row += 1) {
      for (let col = 0; col < piece.shape[row].length; col += 1) {
        if (!piece.shape[row][col]) continue;

        const boardX = piece.x + col;
        const boardY = piece.y + row;

        if (boardY >= 0) {
          board[boardY][boardX] = piece.color;
        }
      }
    }
  }

  function clearLines() {
    let cleared = 0;

    board = board.filter((row) => {
      const full = row.every(Boolean);
      if (full) cleared += 1;
      return !full;
    });

    while (board.length < rows) {
      board.unshift(Array(cols).fill(0));
    }

    if (cleared) {
      score += cleared * 100;
      scoreEl.textContent = String(score);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBoard();

    if (piece) {
      drawShape(piece.x, piece.y, piece.shape, piece.color);
    }
  }

  function drawBoard() {
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const color = board[row][col];
        if (color) drawBlock(col, row, color);
      }
    }
  }

  function drawShape(x, y, shape, color) {
    for (let row = 0; row < shape.length; row += 1) {
      for (let col = 0; col < shape[row].length; col += 1) {
        if (shape[row][col]) {
          drawBlock(x + col, y + row, color);
        }
      }
    }
  }

  function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    ctx.strokeStyle = "rgba(255,255,255,.24)";
    ctx.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
  }
}

async function loadTetrisScores() {
  const root = $("#tetrisLeaderboard");
  if (!root) return;

  try {
    const res = await fetch("/api/scores");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "排行榜加载失败");
    }

    renderTetrisScores(data.scores || []);
  } catch (err) {
    root.innerHTML = `<p class="empty">排行榜没加载出来：${escapeHTML(err.message || "未知错误")}</p>`;
  }
}

function renderTetrisScores(scores) {
  const root = $("#tetrisLeaderboard");
  if (!root) return;

  if (!scores.length) {
    root.innerHTML = `<p class="empty">还没人上榜。</p>`;
    return;
  }

  root.innerHTML = scores
    .slice(0, 5)
    .map((item, index) => {
      return `
        <div class="score-row">
          <span class="rank">${String(index + 1).padStart(2, "0")}</span>
          <strong>${escapeHTML(item.name || "匿名玩家")}</strong>
          <small>${escapeHTML(item.score)}</small>
        </div>
      `;
    })
    .join("");
}

function createBoard(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function randomBlockColor() {
  const colors = ["#ff4fd8", "#5be7ff", "#d9ff63", "#ffb347", "#9b7cff"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = value;
}

function setHint(text, type) {
  const hint = $("#messageHint");
  if (!hint) return;

  hint.textContent = text;
  hint.className = `hint ${type || ""}`.trim();
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value).replaceAll("`", "&#096;");
}
