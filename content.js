// 视频控制类
class VideoController {
  constructor() {
    this.video = null;
    this.audioContext = null;
    this.analyser = null;
    this.skipSegments = [];
    this.currentSpeed = 1.0;
    this.isAnalyzing = false;

    this.init();
  }

  init() {
    // 监听视频元素
    this.observeVideoElement();

    // 添加快捷键监听
    document.addEventListener("keydown", this.handleKeyPress.bind(this));
  }

  observeVideoElement() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          const video = document.querySelector("video");
          if (video && !this.video) {
            this.video = video;
            this.setupVideoControls();
            this.setupAudioAnalysis();
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  setupVideoControls() {
    if (!this.video) return;

    // 监听播放速度变化
    this.video.addEventListener("ratechange", () => {
      this.currentSpeed = this.video.playbackRate;
      this.updateSpeedDisplay();
    });
  }

  setupAudioAnalysis() {
    if (!this.video) return;

    // 创建音频分析器
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const source = this.audioContext.createMediaElementSource(this.video);
    this.analyser = this.audioContext.createAnalyser();
    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  setPlaybackRate(speed) {
    if (!this.video) return;

    this.currentSpeed = speed;
    this.video.playbackRate = speed;
    this.updateSpeedDisplay();
  }

  updateSpeedDisplay() {
    // 发送消息给popup更新显示
    chrome.runtime.sendMessage({
      type: "SPEED_CHANGED",
      speed: this.currentSpeed,
    });
  }

  handleKeyPress(event) {
    if (!this.video) return;

    switch (event.key) {
      case "ArrowUp":
        this.increaseSpeed();
        break;
      case "ArrowDown":
        this.decreaseSpeed();
        break;
    }
  }

  increaseSpeed() {
    const speeds = [
      0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 3.5, 4.0,
    ];
    const currentIndex = speeds.indexOf(this.currentSpeed);
    if (currentIndex < speeds.length - 1) {
      this.setPlaybackRate(speeds[currentIndex + 1]);
    }
  }

  decreaseSpeed() {
    const speeds = [
      0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 3.5, 4.0,
    ];
    const currentIndex = speeds.indexOf(this.currentSpeed);
    if (currentIndex > 0) {
      this.setPlaybackRate(speeds[currentIndex - 1]);
    }
  }

  async analyzeSilence() {
    if (!this.video || !this.analyser || this.isAnalyzing) return;

    this.isAnalyzing = true;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const silenceThreshold = 10; // 静音阈值
    let silenceStart = null;

    const checkSilence = () => {
      if (!this.video || !this.isAnalyzing) return;

      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;

      if (average < silenceThreshold) {
        if (!silenceStart) {
          silenceStart = this.video.currentTime;
        }
      } else if (silenceStart) {
        const silenceEnd = this.video.currentTime;
        if (silenceEnd - silenceStart > 2) {
          // 静音超过2秒才记录
          this.skipSegments.push({
            start: silenceStart,
            end: silenceEnd,
          });
        }
        silenceStart = null;
      }

      requestAnimationFrame(checkSilence);
    };

    checkSilence();
  }

  stopSilenceAnalysis() {
    this.isAnalyzing = false;
  }

  skipSilentSegments() {
    if (!this.video || this.skipSegments.length === 0) return;

    const currentTime = this.video.currentTime;
    const nextSegment = this.skipSegments.find(
      (segment) => segment.start > currentTime
    );

    if (nextSegment) {
      this.video.currentTime = nextSegment.end;
      this.showSkipNotification(nextSegment.end - nextSegment.start);
    }
  }

  showSkipNotification(duration) {
    const notification = document.createElement("div");
    notification.className = "skip-notification";
    notification.innerHTML = `⏩ 已跳过${Math.round(
      duration
    )}秒静音片段 | <a href="#" class="undo-skip">撤销</a>`;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// 初始化视频控制器
const videoController = new VideoController();

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case "SET_SPEED":
      videoController.setPlaybackRate(request.speed);
      break;
    case "ANALYZE_SILENCE":
      videoController.analyzeSilence();
      break;
    case "STOP_ANALYSIS":
      videoController.stopSilenceAnalysis();
      break;
    case "SKIP_SILENCE":
      videoController.skipSilentSegments();
      break;
  }
});
