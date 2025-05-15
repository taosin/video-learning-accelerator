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

    // 初始化AI提供商状态
    initAIProviderStatus();
  });

  // 添加配置按钮点击事件
  const configButton = document.getElementById("config-button");
  if (configButton) {
    configButton.addEventListener("click", function () {
      chrome.runtime.openOptionsPage();
    });
  }
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
    } else if (request.type === "NOTES_GENERATED") {
      showNotes(request.notes);
    } else if (request.type === "AI_ERROR") {
      showError(request.error);
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

// 显示笔记内容
function showNotes(notes) {
  // 创建笔记显示模态框
  const modal = document.createElement("div");
  modal.className = "notes-modal";
  modal.innerHTML = `
    <div class="notes-content">
      <div class="notes-header">
        <h3>学习笔记</h3>
        <div class="notes-actions">
          <button class="export-btn">导出笔记</button>
          <button class="close-btn">关闭</button>
        </div>
      </div>
      <div class="notes-body">
        ${formatNotes(notes)}
      </div>
    </div>
  `;

  // 添加样式
  const style = document.createElement("style");
  style.textContent = `
    .notes-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    }
    .notes-content {
      background: white;
      width: 80%;
      max-width: 800px;
      max-height: 80vh;
      border-radius: 8px;
      overflow: hidden;
    }
    .notes-header {
      padding: 15px;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .notes-actions {
      display: flex;
      gap: 10px;
    }
    .notes-body {
      padding: 20px;
      overflow-y: auto;
      max-height: calc(80vh - 60px);
    }
    .export-btn, .close-btn {
      padding: 8px 15px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .export-btn {
      background: #4CAF50;
      color: white;
    }
    .close-btn {
      background: #f44336;
      color: white;
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(modal);

  // 添加事件监听
  modal.querySelector(".export-btn").addEventListener("click", () => {
    exportNotes(notes);
  });

  modal.querySelector(".close-btn").addEventListener("click", () => {
    modal.remove();
  });
}

// 格式化笔记内容
function formatNotes(notes) {
  // 将笔记内容转换为HTML格式
  return notes
    .split("\n")
    .map((line) => {
      if (line.startsWith("#")) {
        return `<h${line.indexOf(" ")}>${line
          .substring(line.indexOf(" "))
          .trim()}</h${line.indexOf(" ")}>`;
      }
      return `<p>${line}</p>`;
    })
    .join("");
}

// 导出笔记
function exportNotes(notes) {
  const blob = new Blob([notes], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `学习笔记_${new Date().toLocaleDateString()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 显示错误信息
function showError(error) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = error;

  // 添加样式
  const style = document.createElement("style");
  style.textContent = `
    .error-message {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      z-index: 10000;
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(errorDiv);

  setTimeout(() => {
    errorDiv.remove();
  }, 3000);
}

// 初始化AI提供商状态
async function initAIProviderStatus() {
  const statusElement = document.getElementById("ai-provider-status");
  if (!statusElement) return;

  try {
    const config = await new Promise((resolve) => {
      chrome.storage.local.get(["aiConfig"], function (result) {
        resolve(result.aiConfig || { provider: "openai" });
      });
    });

    const providerName = config.provider === "openai" ? "OpenAI" : "DeepSeek";
    const hasKey = !!config[`${config.provider}Key`];

    statusElement.textContent = `当前AI提供商: ${providerName} (${
      hasKey ? "已配置" : "未配置"
    })`;
    statusElement.style.color = hasKey ? "#4CAF50" : "#f44336";
  } catch (error) {
    console.error("获取AI提供商状态失败:", error);
    statusElement.textContent = "获取AI提供商状态失败";
    statusElement.style.color = "#f44336";
  }
}
