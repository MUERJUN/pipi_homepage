const $ = (selector) => document.querySelector(selector);

const state = {
  reactionTimer: null,
  reactionStart: 0,
  reactionArmed: false,
  logoClicks: 0,
};

const cards = [
  { rarity: "N", title: "Normal boot", text: "今天正常开机" },
  { rarity: "R", title: "Low battery", text: "能跑就行" },
  { rarity: "R", title: "Focus mode", text: "何意味？" },
  { rarity: "SR", title: "Weird signal", text: "看啥呢" },
  { rarity: "SR", title: "Clean chaos", text: "1111111" },
  { rarity: "SSR", title: "Page alive", text: "管你这的那的先来给我炒个菜" },
  { rarity: "UR", title: "Do not explain", text: "没死呢，别想吃席了" },
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
          ? "Secret mode enabled."
          : "Secret mode disabled.";
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

      btn.textContent = "Restart";
      return;
    }

    clearTimeout(state.reactionTimer);

    box.className = "reaction-box waiting";
    box.innerHTML = `
      <strong>Wait...</strong>
      <p>别急，变绿再点。</p>
    `;

    btn.textContent = "Waiting";
    btn.disabled = true;

    const delay = 900 + Math.floor(Math.random() * 2600);

    state.reactionTimer = setTimeout(() => {
      state.reactionArmed = true;
      state.reactionStart = Date.now();

      box.className = "reaction-box ready";
      box.innerHTML = `
        <strong>CLICK</strong>
        <p>现在点按钮。</p>
      `;

      btn.textContent = "Click";
      btn.disabled = false;
    }, delay);

    box.onclick = () => {
      if (!state.reactionArmed && btn.disabled) {
        clearTimeout(state.reactionTimer);
        btn.disabled = false;
        btn.textContent = "Restart";
        box.className = "reaction-box failed";
        box.innerHTML = `
          <strong>Too early</strong>
          <p>你这个预判有点急。</p>
        `;
      }
    };
  });
}

function reactionComment(ms) {
  if (ms < 180) return "你开桂了吧";
  if (ms < 260) return "牛福";
  if (ms < 360) return "正常人类";
  if (ms < 520) return "是真人吗";
  return "什么时候混进来的？";
}

async function loadSteam() {
  const apiStatus = $("#steamApiStatus");

  try {
    const res = await fetch("/api/steam");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Steam API failed");
    }

    renderSteam(data);

    if (apiStatus) apiStatus.textContent = "Online";
  } catch (err) {
    if (apiStatus) apiStatus.textContent = "Failed";

    $("#steamName").textContent = "Steam load failed";
    $("#steamStatus").textContent = err.message || "Unknown error";
    $("#recentGames").innerHTML = `<p class="empty">Steam 信息加载失败。</p>`;
    $("#topGames").innerHTML = `<p class="empty">Steam 信息加载失败。</p>`;
  }
}

function renderSteam(data) {
  const profile = data.profile || {};
  const summary = data.summary || {};

  $("#steamName").textContent = profile.name || "Unknown";
  $("#steamStatus").textContent = profile.status || "Unknown";
  $("#steamGameCount").textContent = summary.gameCount ?? "--";
  $("#steamTotalHours").textContent =
    summary.totalHours != null ? `${summary.totalHours}h` : "--";

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

function renderGames(selector, games, mode) {
  const root = $(selector);
  if (!root) return;

  if (!games.length) {
    root.innerHTML = `<p class="empty">No public game data.</p>`;
    return;
  }

  root.innerHTML = games
    .map((game) => {
      const hours =
        mode === "recent"
          ? `${game.hours2Weeks || 0}h / 2 weeks`
          : `${game.hours || 0}h total`;

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
    const hint = $("#messageHint");

    if (!content) {
      setHint("留言不能为空。", "bad");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Sending...";
    setHint("正在发送...", "");

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
      setHint("留言发送成功。", "ok");
      await loadMessages();
    } catch (err) {
      setHint(err.message || "留言发送失败。", "bad");
    } finally {
      btn.disabled = false;
      btn.textContent = "Send message";
    }
  });
}

async function loadMessages() {
  const status = $("#guestbookStatus");

  try {
    const res = await fetch("/api/messages");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Guestbook failed");
    }

    renderMessages(data.messages || []);

    if (status) status.textContent = "Online";
  } catch (err) {
    if (status) status.textContent = "Failed";

    const list = $("#messageList");
    if (list) {
      list.innerHTML = `<p class="empty">留言加载失败：${escapeHTML(err.message || "Unknown")}</p>`;
    }
  }
}

function renderMessages(messages) {
  const list = $("#messageList");
  const count = $("#messageCount");

  if (count) count.textContent = String(messages.length);

  if (!list) return;

  if (!messages.length) {
    list.innerHTML = `<p class="empty">还没有留言。</p>`;
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