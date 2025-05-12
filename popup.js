document.addEventListener("DOMContentLoaded", () => {
  // 获取当前标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];

    // 初始化速度按钮
    initSpeedButtons(currentTab);

    // 初始化功能按钮
    initActionButtons(currentTab);

    // 初始化AI摘要功能
    initAISummary(currentTab);
  });
});

function initSpeedButtons(tab) {
  const speedButtons = document.querySelectorAll(".speed-btn");
  const speedDisplay = document.querySelector(".speed-display");

  // 获取当前速度
  chrome.tabs.sendMessage(tab.id, { type: "GET_SPEED" }, (response) => {
    if (response && response.speed) {
      updateSpeedDisplay(response.speed);
    }
  });

  // 添加速度按钮点击事件
  speedButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const speed = parseFloat(button.dataset.speed);
      chrome.tabs.sendMessage(tab.id, {
        type: "SET_SPEED",
        speed: speed,
      });
      updateSpeedDisplay(speed);
    });
  });
}

function updateSpeedDisplay(speed) {
  const speedDisplay = document.querySelector(".speed-display");
  const speedButtons = document.querySelectorAll(".speed-btn");

  speedDisplay.textContent = `${speed}x`;

  // 更新按钮状态
  speedButtons.forEach((button) => {
    if (parseFloat(button.dataset.speed) === speed) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}

function initActionButtons(tab) {
  const skipSilenceBtn = document.getElementById("skipSilence");
  const generateAIBtn = document.getElementById("generateAI");

  // 跳过静音按钮
  skipSilenceBtn.addEventListener("click", () => {
    chrome.tabs.sendMessage(tab.id, { type: "SKIP_SILENCE" });
  });

  // AI摘要按钮
  generateAIBtn.addEventListener("click", () => {
    chrome.tabs.sendMessage(tab.id, { type: "GENERATE_AI_SUMMARY" });
  });
}

function initAISummary(tab) {
  const chaptersList = document.getElementById("chaptersList");
  const progressFill = document.querySelector(".progress-fill");
  const generateNotesBtn = document.getElementById("generateNotes");

  // 监听AI摘要生成进度
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "AI_PROGRESS") {
      progressFill.style.width = `${request.progress}%`;
    } else if (request.type === "AI_CHAPTERS") {
      updateChaptersList(request.chapters);
    }
  });

  // 生成笔记按钮
  generateNotesBtn.addEventListener("click", () => {
    chrome.tabs.sendMessage(tab.id, { type: "GENERATE_NOTES" });
  });
}

function updateChaptersList(chapters) {
  const chaptersList = document.getElementById("chaptersList");
  chaptersList.innerHTML = "";

  chapters.forEach((chapter) => {
    const chapterItem = document.createElement("div");
    chapterItem.className = "chapter-item";
    chapterItem.innerHTML = `
      <div>[${formatTime(chapter.time)}] ${chapter.title}</div>
      <div class="chapter-time">${chapter.description}</div>
    `;
    chaptersList.appendChild(chapterItem);
  });
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}
