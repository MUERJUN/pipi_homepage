const $ = (selector) => document.querySelector(selector);

const state = {
  reactionTimer: null,
  reactionStart: 0,
  reactionArmed: false,
  logoClicks: 0,
};

const cards = [
  { rarity: "N", title: "正常开机", text: "今天正常开机，先别想太多。" },
  { rarity: "N", title: "能跑就行", text: "别管优不优雅，能跑已经很给面子了。" },
  { rarity: "R", title: "低电量", text: "有点虚，但不是不能用。" },
  { rarity: "R", title: "何意味？", text: "看懂了算你厉害，我也不一定懂。" },
  { rarity: "R", title: "别问", text: "问就是还没做完。" },
  { rarity: "SR", title: "看啥呢", text: "来都来了，点两下再走。" },
  { rarity: "SR", title: "干净混乱", text: "可以乱，但不能丑。" },
  { rarity: "SR", title: "施工中", text: "不是没做完，是正在生成。" },
  { rarity: "SSR", title: "网页活着", text: "管你这的那的，先来给我炒个菜。" },
  { rarity: "SSR", title: "系统正常", text: "正常得有点不正常。" },
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

  loadSteam();
  loadMessages();
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
  const logo = $(".logo");
  const secretText = $("#secretText");

  if (!logo) return;

  logo.addEventListener("click", () => {
    state.logoClicks += 1;

    if (state.logoClicks >= 5) {
      document.body.classList.toggle("secret-mode");
      state.logoClicks = 0;

      if (secretText) {
        secretText.textContent = document.body.classList.contains("secret-mode")
          ? "行，被你点出来了。"
          : "关了，当没发生过。";
      }
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
  const apiStatus = $("#steamApiStatus");

  try {
    const res = await fetch("/api/steam");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Steam 加载失败");
    }

    renderSteam(data);

    if (apiStatus) apiStatus.textContent = "能用";
  } catch (err) {
    if (apiStatus) apiStatus.textContent = "炸了";

    const steamName = $("#steamName");
    const steamStatus = $("#steamStatus");
    const recentGames = $("#recentGames");
    const topGames = $("#topGames");

    if (steamName) steamName.textContent = "Steam 没加载出来";
    if (steamStatus) steamStatus.textContent = err.message || "未知错误";
    if (recentGames) recentGames.innerHTML = `<p class="empty">Steam 信息加载失败。</p>`;
    if (topGames) topGames.innerHTML = `<p class="empty">Steam 信息加载失败。</p>`;
  }
}

function renderSteam(data) {
  const profile = data.profile || {};
  const summary = data.summary || {};

  const steamName = $("#steamName");
  const steamStatus = $("#steamStatus");
  const steamGameCount = $("#steamGameCount");
  const steamTotalHours = $("#steamTotalHours");

  if (steamName) steamName.textContent = profile.name || "未知玩家";
  if (steamStatus) steamStatus.textContent = translateSteamStatus(profile.status);
  if (steamGameCount) steamGameCount.textContent = summary.gameCount ?? "--";
  if (steamTotalHours) {
    steamTotalHours.textContent =
      summary.totalHours != null ? `${summary.totalHours} 小时` : "--";
  }

  const avatar = $("#steamAvatar");
  if (avatar) {
    avatar.src = profile.avatar || "";
  }

  const link = $("#steamProfileLink");
  if (link) {
    link.href = profile.profileUrl || "https://steamcommunity.com/";
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
  const status = $("#guestbookStatus");

  try {
    const res = await fetch("/api/messages");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "留言板加载失败");
    }

    renderMessages(data.messages || []);

    if (status) status.textContent = "能用";
  } catch (err) {
    if (status) status.textContent = "炸了";

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