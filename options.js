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
  console.log("开始加载配置...");
  chrome.storage.sync.get(["aiConfig"], function (result) {
    console.log("获取到的配置:", result);
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
  console.log("开始保存配置...");
  const provider = document.getElementById("aiProvider").value;
  const openaiKey = document.getElementById("openaiKey").value.trim();
  const deepseekKey = document.getElementById("deepseekKey").value.trim();

  console.log("当前选择的提供商:", provider);
  console.log("OpenAI Key长度:", openaiKey.length);
  console.log("DeepSeek Key长度:", deepseekKey.length);

  // 验证当前选中的提供商是否已输入密钥
  if (provider === "openai" && !openaiKey) {
    showStatus("请输入OpenAI API密钥", "error");
    return;
  }
  if (provider === "deepseek" && !deepseekKey) {
    showStatus("请输入DeepSeek API密钥", "error");
    return;
  }

  const config = {
    provider,
    openaiKey,
    deepseekKey,
  };

  console.log("准备保存的配置:", config);

  // 保存到Chrome存储
  chrome.storage.sync.set({ aiConfig: config }, function () {
    if (chrome.runtime.lastError) {
      console.error("保存配置失败:", chrome.runtime.lastError);
      showStatus("保存配置失败: " + chrome.runtime.lastError.message, "error");
    } else {
      console.log("配置保存成功");
      showStatus("配置已保存", "success");

      // 验证保存是否成功
      chrome.storage.sync.get(["aiConfig"], function (result) {
        console.log("保存后读取的配置:", result.aiConfig);
        if (result.aiConfig && result.aiConfig[`${provider}Key`]) {
          console.log("配置验证成功");
        } else {
          console.error("配置验证失败");
        }
      });
    }
  });
}

// 切换API密钥显示/隐藏
function toggleVisibility(inputId) {
  const input = document.getElementById(inputId);
  input.type = input.type === "password" ? "text" : "password";
}

// 显示状态信息
function showStatus(message, type) {
  console.log("状态信息:", message, type);
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = "status " + type;
  status.style.display = "block";

  setTimeout(() => {
    status.style.display = "none";
  }, 3000);
}
