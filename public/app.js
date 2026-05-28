window.addEventListener("DOMContentLoaded", () => {
  const chatMessages = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const newChatBtn = document.getElementById("newChatBtn");
  const starfield = document.getElementById("starfield");

  if (!chatMessages || !chatInput || !sendBtn || !newChatBtn || !starfield) {
    console.error("页面元素未找到：", {
      chatMessages,
      chatInput,
      sendBtn,
      newChatBtn,
      starfield
    });
    return;
  }

  let history = [];

  const openingMessages = [
 ["（爱弥斯轻轻撩了下头发）……来找我了？"],
    ["（她偏过脸看你）嗯？今天这么安静。"],
    ["（爱弥斯看了你一会儿）……怎么了，漂泊者。"],
    ["……在呢。", "你这次倒是来得挺快。"],
    ["（她像是刚回过神）啊，是你。"],
    ["（爱弥斯眨了下眼）我还以为你要再晚一点。"],
    ["……嗯？", "站着不说话，是想让我先开口吗。"],
    ["（爱弥斯安静了一下）你来了啊。"],
    ["（她轻轻笑了一下）这次不打算让我等太久了？"],
    ["……我在。", "所以，想和我说什么？"],
    ["（爱弥斯把耳边的发丝别到一旁）怎么，特地来找我？"],
    ["你来了。", "……那我就当你是来陪我的。"]
  ];

  function getRandomOpening() {
    return openingMessages[Math.floor(Math.random() * openingMessages.length)];
  }

  function createStars() {
    const starCount = window.innerWidth < 640 ? 36 : 68;
    starfield.innerHTML = "";

    for (let i = 0; i < starCount; i += 1) {
      const star = document.createElement("span");
      const size = Math.random() * 2.6 + 1;
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const delay = Math.random() * 5;
      const duration = 2.8 + Math.random() * 4.5;

      star.className = `star${size > 2.4 ? " large" : ""}`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.left = `${left}%`;
      star.style.top = `${top}%`;
      star.style.opacity = (0.2 + Math.random() * 0.8).toFixed(2);
      star.style.setProperty("--twinkle-duration", `${duration}s`);
      star.style.animationDelay = `${delay}s`;

      starfield.appendChild(star);
    }
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addMessage(text, role) {
    const wrap = document.createElement("div");
    wrap.className = `msg-row ${role}`;

    const bubble = document.createElement("div");
    bubble.className = `msg-bubble ${role}`;
    bubble.textContent = text;

    wrap.appendChild(bubble);
    chatMessages.appendChild(wrap);
    scrollToBottom();
  }

  function addTyping() {
    const wrap = document.createElement("div");
    wrap.className = "msg-row assistant";
    wrap.id = "typingRow";

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble assistant typing";
    bubble.textContent = "……";

    wrap.appendChild(bubble);
    chatMessages.appendChild(wrap);
    scrollToBottom();
  }

  function removeTyping() {
    const el = document.getElementById("typingRow");
    if (el) el.remove();
  }

  function resizeInput() {
    chatInput.style.height = "auto";
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 120)}px`;
  }

  function playOpening(lines) {
    chatMessages.innerHTML = "";

    lines.forEach((line, index) => {
      setTimeout(() => {
        addMessage(line, "assistant");
      }, index * 650);
    });
  }

  async function sendMessage() {
    const raw = chatInput.value;
    const text = raw.trim();

    if (!text) {
      chatInput.focus();
      return;
    }

    addMessage(text, "user");
    history.push({ role: "user", content: text });

    chatInput.value = "";
    resizeInput();
    sendBtn.disabled = true;
    addTyping();

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: text,
          history
        })
      });

      const data = await resp.json().catch(() => ({}));
      removeTyping();

      if (!resp.ok) {
        const errText = data.error || "出错了。";
        addMessage(errText, "assistant");
        history.push({ role: "assistant", content: errText });
        return;
      }

      const reply = (data.reply || "……").trim();
      addMessage(reply, "assistant");
      history.push({ role: "assistant", content: reply });

      if (history.length > 20) {
        history = history.slice(-20);
      }
    } catch (err) {
      console.error("发送失败：", err);
      removeTyping();
      const failText = "（爱弥斯微微蹙眉）讯号被星潮扰乱了，再试一次。";
      addMessage(failText, "assistant");
      history.push({ role: "assistant", content: failText });
    } finally {
      sendBtn.disabled = false;
      chatInput.focus();
    }
  }

  sendBtn.addEventListener("click", sendMessage);

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  chatInput.addEventListener("input", resizeInput);

  newChatBtn.addEventListener("click", () => {
    history = [];
    playOpening(getRandomOpening());
    chatInput.value = "";
    resizeInput();
    chatInput.focus();
  });

  window.addEventListener("resize", createStars);

  createStars();
  playOpening(getRandomOpening());
  resizeInput();
});