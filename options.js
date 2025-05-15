// 页面加载时加载配置
document.addEventListener("DOMContentLoaded", loadConfig);

// 监听AI提供商选择变化
document.getElementById("aiProvider").addEventListener("change", function (e) {
  const provider = e.target.value;
  document.getElementById("openaiConfig").style.display =
    provider === "openai" ? "block" : "none";
  document.getElementById("deepseekConfig").style.display =
    provider === "deepseek" ? "block" : "none";
});

// 加载配置
function loadConfig() {
  chrome.storage.local.get(["aiConfig"], function (result) {
    if (result.aiConfig) {
      const config = result.aiConfig;
      document.getElementById("aiProvider").value = config.provider || "openai";
      document.getElementById("openaiKey").value = config.openaiKey || "";
      document.getElementById("deepseekKey").value = config.deepseekKey || "";

      // 触发一次change事件来显示正确的配置面板
      document.getElementById("aiProvider").dispatchEvent(new Event("change"));
    }
  });
}

// 保存配置
function saveConfig() {
  const provider = document.getElementById("aiProvider").value;
  const openaiKey = document.getElementById("openaiKey").value;
  const deepseekKey = document.getElementById("deepseekKey").value;

  const config = {
    provider,
    openaiKey,
    deepseekKey,
  };

  chrome.storage.local.set({ aiConfig: config }, function () {
    showStatus("配置已保存", "success");
  });
}

// 切换API密钥显示/隐藏
function toggleVisibility(inputId) {
  const input = document.getElementById(inputId);
  input.type = input.type === "password" ? "text" : "password";
}

// 显示状态信息
function showStatus(message, type) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = "status " + type;

  setTimeout(() => {
    status.style.display = "none";
  }, 3000);
}
