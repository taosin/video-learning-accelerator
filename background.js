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

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case "SPEED_CHANGED":
      // 更新存储的速度设置
      chrome.storage.local.set({ lastSpeed: request.speed });
      break;

    case "GENERATE_AI_SUMMARY":
      // 调用OpenAI API生成摘要
      generateAISummary(sender.tab.id);
      break;
  }
});

// 生成AI摘要
async function generateAISummary(tabId) {
  try {
    // 获取视频字幕
    const subtitles = await getVideoSubtitles(tabId);

    // 调用OpenAI API
    const summary = await callOpenAI(subtitles);

    // 发送摘要回content script
    chrome.tabs.sendMessage(tabId, {
      type: "AI_CHAPTERS",
      chapters: summary.chapters,
    });
  } catch (error) {
    console.error("生成AI摘要失败:", error);
  }
}

// 获取视频字幕
async function getVideoSubtitles(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "GET_SUBTITLES" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response.subtitles);
      }
    });
  });
}

// 调用OpenAI API
async function callOpenAI(subtitles) {
  // TODO: 实现OpenAI API调用
  // 这里需要添加实际的API调用代码
  return {
    chapters: [
      {
        time: 80,
        title: "机器学习基础概念",
        description: "检测到3个专业术语",
      },
      {
        time: 345,
        title: "监督学习原理",
        description: "公式推导重点",
      },
      {
        time: 750,
        title: "实战案例演示",
        description: "建议反复观看",
      },
    ],
  };
}
