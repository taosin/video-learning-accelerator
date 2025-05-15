// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && isVideoPage(tab.url)) {
    // 注入内容脚本
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    });
  }
});

// 检查是否是视频页面
function isVideoPage(url) {
  const videoDomains = [
    "youtube.com",
    "bilibili.com",
    "tencent.com",
    "163.com",
  ];

  return videoDomains.some((domain) => url.includes(domain));
}

// AI API配置
const API_CONFIGS = {
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-3.5-turbo",
  },
  deepseek: {
    url: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
  },
};

// 获取AI配置
async function getAIConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["aiConfig"], function (result) {
      resolve(result.aiConfig || { provider: "openai" });
    });
  });
}

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case "SPEED_CHANGED":
      // 更新存储的速度设置
      chrome.storage.local.set({ lastSpeed: request.speed });
      break;

    case "GENERATE_AI_SUMMARY":
      generateAISummary(sender.tab.id, request.subtitles);
      break;

    case "GENERATE_NOTES":
      generateNotes(sender.tab.id, request.subtitles);
      break;
  }
});

// 生成AI摘要
async function generateAISummary(tabId, subtitles) {
  try {
    // 获取AI配置
    const config = await getAIConfig();
    if (!config[`${config.provider}Key`]) {
      throw new Error("请先在配置页面设置API密钥");
    }

    // 发送进度更新
    chrome.tabs.sendMessage(tabId, {
      type: "AI_PROGRESS",
      progress: 20,
    });

    // 准备提示词
    const prompt = `请分析以下视频字幕内容，生成章节标记和关键内容摘要：
    ${subtitles.map((s) => s.text).join("\n")}
    
    请按以下格式返回：
    1. 章节标题和时间点
    2. 每个章节的关键内容
    3. 重要概念和术语`;

    // 调用AI API
    const apiConfig = API_CONFIGS[config.provider];
    const response = await fetch(apiConfig.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config[`${config.provider}Key`]}`,
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: [
          {
            role: "system",
            content:
              "你是一个专业的视频内容分析助手，擅长提取视频内容的关键信息和生成结构化的笔记。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    // 发送进度更新
    chrome.tabs.sendMessage(tabId, {
      type: "AI_PROGRESS",
      progress: 60,
    });

    const data = await response.json();
    const summary = parseAIResponse(data.choices[0].message.content);

    // 发送进度更新
    chrome.tabs.sendMessage(tabId, {
      type: "AI_PROGRESS",
      progress: 100,
    });

    // 发送章节信息
    chrome.tabs.sendMessage(tabId, {
      type: "AI_CHAPTERS",
      chapters: summary.chapters,
    });
  } catch (error) {
    console.error("生成AI摘要失败:", error);
    chrome.tabs.sendMessage(tabId, {
      type: "AI_ERROR",
      error: error.message || "生成摘要失败，请稍后重试",
    });
  }
}

// 生成完整笔记
async function generateNotes(tabId, subtitles) {
  try {
    // 获取AI配置
    const config = await getAIConfig();
    if (!config[`${config.provider}Key`]) {
      throw new Error("请先在配置页面设置API密钥");
    }

    // 发送进度更新
    chrome.tabs.sendMessage(tabId, {
      type: "AI_PROGRESS",
      progress: 20,
    });

    // 准备提示词
    const prompt = `请根据以下视频字幕内容，生成一份完整的学习笔记：
    ${subtitles.map((s) => s.text).join("\n")}
    
    请按以下格式生成笔记：
    1. 视频概述
    2. 主要章节内容
    3. 重要概念解释
    4. 关键点总结
    5. 学习建议`;

    // 调用AI API
    const apiConfig = API_CONFIGS[config.provider];
    const response = await fetch(apiConfig.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config[`${config.provider}Key`]}`,
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: [
          {
            role: "system",
            content:
              "你是一个专业的学习助手，擅长将视频内容转化为结构化的学习笔记。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    // 发送进度更新
    chrome.tabs.sendMessage(tabId, {
      type: "AI_PROGRESS",
      progress: 60,
    });

    const data = await response.json();
    const notes = data.choices[0].message.content;

    // 发送进度更新
    chrome.tabs.sendMessage(tabId, {
      type: "AI_PROGRESS",
      progress: 100,
    });

    // 发送笔记内容
    chrome.tabs.sendMessage(tabId, {
      type: "NOTES_GENERATED",
      notes: notes,
    });

    // 保存笔记到本地存储
    chrome.storage.local.set({
      [`notes_${tabId}`]: {
        timestamp: Date.now(),
        content: notes,
      },
    });
  } catch (error) {
    console.error("生成笔记失败:", error);
    chrome.tabs.sendMessage(tabId, {
      type: "AI_ERROR",
      error: error.message || "生成笔记失败，请稍后重试",
    });
  }
}

// 解析AI响应
function parseAIResponse(response) {
  // 这里需要根据实际的AI响应格式进行解析
  // 示例实现
  const chapters = [];
  const lines = response.split("\n");

  for (const line of lines) {
    if (line.match(/^\d+\./)) {
      const match = line.match(/\[(\d+:\d+)\]\s*(.+)/);
      if (match) {
        const [_, time, title] = match;
        chapters.push({
          time: parseTimeToSeconds(time),
          title: title.trim(),
          description: "AI生成的内容摘要",
        });
      }
    }
  }

  return { chapters };
}

// 将时间字符串转换为秒数
function parseTimeToSeconds(timeStr) {
  const [minutes, seconds] = timeStr.split(":").map(Number);
  return minutes * 60 + seconds;
}
