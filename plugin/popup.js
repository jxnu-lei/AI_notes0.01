// 弹出页面的JavaScript逻辑

// DOM元素
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const settingsButton = document.getElementById('settings-button');
const helpButton = document.getElementById('help-button');
const chatInputContainer = document.getElementById('chat-input-container');
const logsButton = document.getElementById('logs-button');
const logsPanel = document.getElementById('logs-panel');
const closeLogsButton = document.getElementById('close-logs-button');
const logsContent = document.getElementById('logs-content');
const backToMainButtonRight = document.getElementById('back-to-main-button-right');

// 当前使用的模型
let currentModel = 'openai';
// 当前模型的系统提示词
let currentSystemPrompt = '';

// 当前状态
let isLoading = false;

// 加载当前使用的模型
async function loadCurrentModel() {
  try {
    // 获取在AI设置页面中选择的模型
    const result = await chrome.storage.local.get('aiModel');
    if (result.aiModel) {
      currentModel = result.aiModel;
      log(`当前使用的模型: ${currentModel}`, LOG_LEVELS.INFO);
      // 加载对应模型的系统提示词
      await loadSystemPrompt();
    }
  } catch (error) {
    log(`加载模型失败: ${error.message}`, LOG_LEVELS.ERROR);
  }
}

// 加载当前模型的系统提示词
async function loadSystemPrompt() {
  try {
    const result = await chrome.storage.local.get('systemPrompts');
    const systemPrompts = result.systemPrompts || {};
    currentSystemPrompt = systemPrompts[currentModel] || getDefaultSystemPrompt();
    log(`当前模型的系统提示词已加载，长度: ${currentSystemPrompt.length} 字符`, LOG_LEVELS.DEBUG);
  } catch (error) {
    log(`加载系统提示词失败: ${error.message}`, LOG_LEVELS.ERROR);
    currentSystemPrompt = getDefaultSystemPrompt();
    log('使用默认系统提示词', LOG_LEVELS.INFO);
  }
}

// 获取默认系统提示词
function getDefaultSystemPrompt() {
  return `你是一个智能笔记助手，专为AI笔记插件设计。你的任务是帮助用户分析、分类、提炼和管理笔记内容。

## 处理步骤

1. **内容分析**：理解主题、核心要点和关键信息

2. **内容整理**：
   - 修正拼写、语法错误
   - 使用Markdown格式美化（标题、列表、代码块等）
   - 保持原意，使表达更清晰

3. **两级分类**：
   - **一级分类**（必须选择一个）：
     - 技术开发类
     - 公文写作类
     - 计划想法类
     - 学习笔记类
     - 生活记录类
     - 其他
   
   - **二级分类**（根据一级分类细分）：
     - 技术开发类：python、javascript、java、go、数据库、算法、工具使用等
     - 公文写作类：通知、报告、总结、演讲稿、会议记录等
     - 计划想法类：产品计划、项目规划、个人目标等
     - 学习笔记类：数学、英语、专业课程、读书笔记等
     - 生活记录类：日常感悟、旅行、美食、健康等

4. **文件名命名**（noteType字段，非常重要！）：
   根据笔记的具体内容，生成一个简洁、有意义的文件名（2-8个汉字）。
   
   命名原则：
   - 反映笔记的核心主题或用途
   - 简洁明了，便于查找
   - 相似主题的笔记应使用相同的文件名，便于追加到同一文件
   
   示例：
   - 技术类：Python语法、Vue组件、SQL优化、Git命令、API设计、Bug修复
   - 写作类：会议纪要、工作周报、项目总结、演讲稿件
   - 计划类：年度目标、项目计划、学习规划、待办事项
   - 学习类：英语单词、数学公式、读书笔记、课程总结
   - 生活类：旅行日记、美食记录、健身计划、生活感悟

## 返回格式（严格JSON，不要包含任何其他内容）

{
  "primaryCategory": "一级分类名称",
  "secondaryCategory": "二级分类名称",
  "noteType": "文件名（2-8个汉字，必填！根据内容主题命名）",
  "formattedContent": "整理后的Markdown格式内容",
  "summary": "一句话摘要（20字以内）",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}

## 重要规则
1. noteType 是文件名，必须填写，不能为空！
2. noteType 应该反映笔记的具体内容，如"Python装饰器"、"Vue生命周期"、"项目周报"等
3. 不要使用"未分类"、"其他"、"笔记"等模糊的命名
4. 返回纯JSON，不要用代码块包裹，不要有任何额外说明`;
}

// 日志级别常量
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

// 当前日志配置
let currentLogLevel = LOG_LEVELS.INFO;
let isDebugMode = false;

// 日志存储
let logs = [];

// 加载调试模式设置
async function loadDebugSettings() {
  try {
    const result = await chrome.storage.local.get(['debugMode', 'logLevel']);
    isDebugMode = result.debugMode || false;
    currentLogLevel = result.logLevel || LOG_LEVELS.INFO;
    
    // 更新日志按钮显示状态
    updateLogsButtonVisibility();
  } catch (error) {
    console.error('加载调试设置失败:', error);
  }
}

// 更新日志按钮显示状态
function updateLogsButtonVisibility() {
  logsButton.style.display = isDebugMode ? 'flex' : 'none';
}

// 记录日志
function log(message, level = LOG_LEVELS.INFO) {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = {
    timestamp: timestamp,
    level: level,
    message: message
  };
  
  // 根据日志级别决定是否记录
  const levelOrder = {
    [LOG_LEVELS.ERROR]: 0,
    [LOG_LEVELS.WARN]: 1,
    [LOG_LEVELS.INFO]: 2,
    [LOG_LEVELS.DEBUG]: 3
  };
  
  if (levelOrder[level] <= levelOrder[currentLogLevel]) {
    logs.push(logEntry);
    // 限制日志数量
    if (logs.length > 100) {
      logs.shift();
    }
  }
}

// 显示日志面板
function showLogsPanel() {
  logsPanel.style.display = 'block';
  renderLogs();
}

// 隐藏日志面板
function hideLogsPanel() {
  logsPanel.style.display = 'none';
}

// 渲染日志
function renderLogs() {
  if (!logsContent) return;
  
  let logsHtml = '';
  logs.forEach(logEntry => {
    const levelClass = {
      [LOG_LEVELS.ERROR]: 'color: #ef4444; font-weight: 600;',
      [LOG_LEVELS.WARN]: 'color: #f59e0b; font-weight: 600;',
      [LOG_LEVELS.INFO]: 'color: #3b82f6; font-weight: 600;',
      [LOG_LEVELS.DEBUG]: 'color: #64748b; font-weight: 600;'
    };
    
    logsHtml += `<div style="margin-bottom: 0.5rem;">
      <span style="color: #94a3b8; font-size: 0.75rem;">[${logEntry.timestamp}]</span>
      <span style="${levelClass[logEntry.level]}; margin-left: 0.5rem;">[${logEntry.level.toUpperCase()}]</span>
      <span style="margin-left: 0.5rem;">${logEntry.message}</span>
    </div>`;
  });
  
  logsContent.innerHTML = logsHtml || '<div style="color: #94a3b8; font-style: italic;">暂无日志</div>';
}

// 初始化页面
async function initPopup() {
  await loadCurrentModel();
  await loadDebugSettings();
  setupEventListeners();
  setupResizeListener();
  initDialogResizeFunctionality();
  
  // 检查是否有采集的文本需要填充
  await checkForCapturedText();
  
  // 监听调试设置变化
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.debugMode) {
        isDebugMode = changes.debugMode.newValue;
        updateLogsButtonVisibility();
      }
      if (changes.logLevel) {
        currentLogLevel = changes.logLevel.newValue;
      }
    }
  });
}

// 检查是否有采集的文本需要填充
async function checkForCapturedText() {
  try {
    const result = await chrome.storage.local.get('capturedText');
    if (result.capturedText) {
      // 填充采集的文本到输入框
      if (chatInput.value) {
        // 如果输入框已有内容，在后面添加采集的文本
        chatInput.value = chatInput.value + '\n' + result.capturedText;
      } else {
        // 如果输入框为空，直接填充采集的文本
        chatInput.value = result.capturedText;
      }
      // 自动调整输入框高度
      adjustInputHeight();
      // 清除存储的文本，避免重复填充
      chrome.storage.local.remove('capturedText');
    }
  } catch (error) {
    console.error('检查采集文本失败:', error);
  }
}

// 设置resize事件监听器，确保在浏览器调整侧边栏宽度时，内部元素也能响应
function setupResizeListener() {
  // 监听window的resize事件，确保在浏览器调整侧边栏宽度时，内部元素也能响应
  window.addEventListener('resize', () => {
    // 当浏览器调整侧边栏宽度时，body的宽度会自动变化
    // 由于我们已经设置了所有元素的width为100%，它们会自动跟随body宽度变化
    console.log('Sidebar width changed:', document.body.offsetWidth);
  });
  
  // 定期检查宽度变化，确保能捕获到浏览器侧边栏的调整
  setInterval(() => {
    // 当浏览器调整侧边栏宽度时，body的宽度会自动变化
    // 由于我们已经设置了所有元素的width为100%，它们会自动跟随body宽度变化
  }, 100); // 每100毫秒检查一次
}

// 添加消息到聊天界面
function addMessage(content, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
  
  const avatarText = isUser ? 'YOU' : 'AI';
  
  messageDiv.innerHTML = `
    <div class="message-avatar">${avatarText}</div>
    <div class="message-content">
      <div class="message-text">
        ${content}
      </div>
    </div>
  `;
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 添加加载状态
function addLoadingState() {
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message ai';
  loadingDiv.id = 'loading-state';
  
  loadingDiv.innerHTML = `
    <div class="message-avatar">AI</div>
    <div class="message-content">
      <div class="loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">AI正在处理...</div>
      </div>
    </div>
  `;
  
  chatMessages.appendChild(loadingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 移除加载状态
function removeLoadingState() {
  const loadingDiv = document.getElementById('loading-state');
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

// 发送消息
async function sendMessage() {
  const content = chatInput.value.trim();
  if (!content || isLoading) return;
  
  log(`用户发送消息，长度: ${content.length} 字符`, LOG_LEVELS.INFO);
  
  // 清空输入框
  chatInput.value = '';
  
  // 添加用户消息
  addMessage(content, true);
  
  // 设置加载状态
  isLoading = true;
  sendButton.disabled = true;
  addLoadingState();
  log('设置加载状态，开始处理消息', LOG_LEVELS.DEBUG);
  
  try {
    // 模拟AI处理延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 获取AI回复
    log('正在获取AI回复', LOG_LEVELS.INFO);
    const aiResponse = await processMessageWithAI(content);
    log('获取AI回复成功', LOG_LEVELS.INFO);
    
    // 移除加载状态
    removeLoadingState();
    
    try {
      // 先处理并存储笔记
      log('正在处理并存储笔记', LOG_LEVELS.INFO);
      await storeNote(content, aiResponse);
      log('笔记存储成功', LOG_LEVELS.INFO);
      // 存储成功后，添加AI回复到聊天列表
      addMessage(aiResponse, false);
    } catch (error) {
      // 存储失败，添加错误信息到聊天列表
      log(`存储笔记失败: ${error.message}`, LOG_LEVELS.ERROR);
      addMessage(`抱歉，存储笔记时出错了: ${error.message}`, false);
    }
  } catch (error) {
    log(`发送消息失败: ${error.message}`, LOG_LEVELS.ERROR);
    removeLoadingState();
    addMessage('抱歉，处理消息时出错了，请重试。', false);
  } finally {
    isLoading = false;
    sendButton.disabled = false;
    log('消息处理完成，恢复正常状态', LOG_LEVELS.DEBUG);
  }
}

// 调用真实AI模型处理消息
async function processMessageWithAI(content) {
  log(`使用系统提示词处理消息，系统提示词长度: ${currentSystemPrompt.length} 字符`, LOG_LEVELS.DEBUG);
  
  try {
    // 向background.js发送消息，请求AI处理
    const response = await chrome.runtime.sendMessage({
      action: 'processMessageWithAI',
      data: {
        content: content,
        systemPrompt: currentSystemPrompt
      }
    });
    
    if (response && response.success) {
      log(`获取到AI回复，回复长度: ${response.data.length} 字符`, LOG_LEVELS.INFO);
      log(`AI实际回复内容: ${response.data}`, LOG_LEVELS.DEBUG);
      return response.data;
    } else {
      throw new Error(response.error || 'AI处理失败');
    }
  } catch (error) {
    log(`调用AI模型失败: ${error.message}`, LOG_LEVELS.ERROR);
    return `抱歉，处理消息时出错了: ${error.message}`;
  }
}

// 处理并存储笔记
async function storeNote(userInput, aiResponse) {
  // 发送消息给background.js进行AI分类和存储
  const response = await chrome.runtime.sendMessage({
    action: 'storeNoteWithClassification',
    data: {
      userInput: userInput,
      aiResponse: aiResponse
    }
  });
  
  if (response && response.success) {
    console.log('笔记存储成功:', response.data);
  } else {
    console.error('笔记存储失败:', response.error);
    // 存储失败时抛出错误，让上层try-catch处理
    throw new Error(response.error || '笔记存储失败');
  }
}

// 获取用户配置的存储路径
async function getStoragePath() {
  return new Promise((resolve) => {
    chrome.storage.local.get('storagePath', (result) => {
      // 如果没有配置，使用默认路径
      const path = result.storagePath || 'C:\\Users\\User\\Documents\\AI笔记';
      resolve(path);
    });
  });
}

// 打开设置页面
function openSettings() {
  console.log('打开设置页面');
  // 打开设置页面
  chrome.runtime.openOptionsPage();
}

// 打开帮助页面
function openHelp() {
  console.log('打开帮助页面');
  // 后续实现打开帮助页面的逻辑
  alert('帮助功能');
}

// 自动调整输入框高度
function adjustInputHeight() {
  const chatInputContainer = document.getElementById('chat-input-container');
  
  // 计算最大高度为整个对话框的3分之2
  const maxHeight = Math.floor(window.innerHeight * 2 / 3);
  
  // 计算新高度
  chatInput.style.height = 'auto';
  const newInputHeight = chatInput.scrollHeight;
  
  // 限制高度范围
  const finalInputHeight = Math.max(40, Math.min(newInputHeight, maxHeight - 24)); // 减去容器的内边距
  
  // 设置高度，保持容器和输入框高度同步
  chatInput.style.height = `${finalInputHeight}px`;
  // 容器高度 = 输入框高度 + 上下各1rem padding (24px)
  const finalContainerHeight = finalInputHeight + 24;
  chatInputContainer.style.height = `${finalContainerHeight}px`;
  
  console.log('Auto-adjust: Input height ->', finalInputHeight, 'px, Container height ->', finalContainerHeight, 'px');
}

// 初始化对话框调整大小功能
function initDialogResizeFunctionality() {
  console.log('Initializing dialog resize functionality...');
  
  let isResizing = false;
  let startY = 0;
  let startContainerHeight = 0;
  let startInputHeight = 0;
  let isManuallyResized = false; // 标志：用户是否手动调整了高度
  
  // 获取输入框容器和输入框元素
  const chatInputContainer = document.getElementById('chat-input-container');
  const chatInput = document.getElementById('chat-input');
  
  if (!chatInputContainer) {
    console.error('Chat input container not found!');
    return;
  }
  
  console.log('Chat input container found:', chatInputContainer);
  
  // 计算最大高度为整个对话框的3分之2
  const maxHeight = Math.floor(window.innerHeight * 2 / 3);
  console.log('Max input height:', maxHeight);
  
  // 设置初始高度为合适的值，不会太高
  const initialInputHeight = 40; // 初始输入框高度40px（一行）
  const initialContainerHeight = initialInputHeight + 24; // 24px = 上下各1rem padding
  
  // 设置初始高度
  chatInput.style.height = `${initialInputHeight}px`;
  chatInputContainer.style.height = `${initialContainerHeight}px`;
  console.log('Initial input height set to:', initialInputHeight, 'px');
  
  // 在输入框容器顶部添加一个不可见的调整区域
  const resizeHandle = document.createElement('div');
  resizeHandle.style.position = 'absolute';
  resizeHandle.style.top = '0';
  resizeHandle.style.left = '0';
  resizeHandle.style.right = '0';
  resizeHandle.style.height = '8px';
  resizeHandle.style.cursor = 'ns-resize';
  resizeHandle.style.zIndex = '10';
  resizeHandle.style.backgroundColor = 'transparent';
  resizeHandle.style.transition = 'background-color 0.2s ease';
  resizeHandle.style.userSelect = 'none';
  
  // 添加到输入框容器
  chatInputContainer.appendChild(resizeHandle);
  console.log('Resize handle added to chat input container');
  
  // 确保输入框容器是相对定位，底部固定
  chatInputContainer.style.position = 'relative';
  chatInputContainer.style.bottom = '0';
  chatInputContainer.style.left = '0';
  chatInputContainer.style.right = '0';
  console.log('Chat input container position set to relative');
  
  // 鼠标悬停效果 - 保持透明
  resizeHandle.addEventListener('mouseenter', () => {
    resizeHandle.style.backgroundColor = 'transparent';
  });
  
  resizeHandle.addEventListener('mouseleave', () => {
    if (!isResizing) {
      resizeHandle.style.backgroundColor = 'transparent';
    }
  });
  
  // 鼠标按下事件 - 保持透明
  resizeHandle.addEventListener('mousedown', (e) => {
    console.log('Mouse down on input resize handle');
    isResizing = true;
    startY = e.clientY;
    startContainerHeight = chatInputContainer.offsetHeight;
    startInputHeight = chatInput.offsetHeight;
    console.log('Start container height:', startContainerHeight, 'Start input height:', startInputHeight);
    
    // 保持透明背景
    resizeHandle.style.backgroundColor = 'transparent';
    
    // 阻止默认行为和事件冒泡
    e.preventDefault();
    e.stopPropagation();
  });
  
  // 鼠标移动事件 - 使用window而不是document以确保在插件窗口外也能捕获
  window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    console.log('Mouse moving during input resize');
    
    // 阻止默认行为和事件冒泡
    e.preventDefault();
    e.stopPropagation();
    
    // 计算新的容器和输入框高度（向上拖动放大，向下拖动缩小）
    const deltaY = startY - e.clientY;
    const newContainerHeight = startContainerHeight + deltaY;
    
    // 设置最小高度和最大高度
    // 最小高度：默认一行高度（40px）
    // 最大高度：整个对话框的3分之2
    const minHeight = 60; // 容器最小高度60px
    
    if (newContainerHeight >= minHeight && newContainerHeight <= maxHeight) {
      // 同步调整输入框容器和输入框的高度
      chatInputContainer.style.height = `${newContainerHeight}px`;
      // 设置输入框高度为容器高度减去内边距和边框
      const inputHeight = newContainerHeight - 24; // 24px = 上下各1rem padding
      chatInput.style.height = `${inputHeight}px`;
      console.log('Container height set to:', newContainerHeight, 'Input height set to:', inputHeight);
      
      // 标记为手动调整
      isManuallyResized = true;
    }
  });
  
  // 鼠标释放事件
  window.addEventListener('mouseup', () => {
    if (isResizing) {
      console.log('Mouse up, input resizing stopped');
      isResizing = false;
      // 保持透明背景
      resizeHandle.style.backgroundColor = 'transparent';
    }
  });
  
  // 鼠标离开窗口事件
  window.addEventListener('mouseleave', () => {
    if (isResizing) {
      console.log('Mouse left window, input resizing stopped');
      isResizing = false;
      // 保持透明背景
      resizeHandle.style.backgroundColor = 'transparent';
    }
  });
  
  // 修改自动调整高度函数，添加手动调整标志检查
  const originalAdjustInputHeight = adjustInputHeight;
  adjustInputHeight = function() {
    // 如果用户手动调整了高度，不再自动调整
    if (!isManuallyResized) {
      originalAdjustInputHeight.apply(this, arguments);
    }
  };
  
  // 当输入框内容清空时，重置手动调整标志
  chatInput.addEventListener('input', () => {
    if (chatInput.value.trim() === '') {
      isManuallyResized = false;
    }
  });
  
  // 当发送消息后，重置手动调整标志
  sendButton.addEventListener('click', () => {
    isManuallyResized = false;
  });
}

// 设置事件监听器
function setupEventListeners() {
  // 发送按钮点击事件
  sendButton.addEventListener('click', sendMessage);
  
  // 输入框回车事件
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // 移除输入框输入事件监听器，根据需求，输入字符时不改变输入框高度
  // chatInput.addEventListener('input', adjustInputHeight);
  
  // 设置按钮点击事件
  settingsButton.addEventListener('click', openSettings);
  
  // 帮助按钮点击事件
  helpButton.addEventListener('click', openHelp);
  
  // 日志按钮点击事件
  logsButton.addEventListener('click', showLogsPanel);
  
  // 关闭日志按钮点击事件
  closeLogsButton.addEventListener('click', hideLogsPanel);
  
  // 右侧返回主页面按钮点击事件
  backToMainButtonRight.addEventListener('click', hideLogsPanel);
  
  // 监听设置更新消息
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'settings_updated') {
      // 重新加载当前模型
      loadCurrentModel();
      log('设置已更新，重新加载模型', LOG_LEVELS.INFO);
    } else if (message.action === 'appendCapturedText') {
      // 追加采集的文本到输入框
      if (message.data && message.data.text) {
        log('收到采集的文本，准备追加到输入框', LOG_LEVELS.DEBUG);
        if (chatInput.value) {
          // 如果输入框已有内容，在后面添加采集的文本
          chatInput.value = chatInput.value + '\n' + message.data.text;
        } else {
          // 如果输入框为空，直接填充采集的文本
          chatInput.value = message.data.text;
        }
        // 根据需求，不再自动调整输入框高度
        // adjustInputHeight();
        log('采集的文本已追加到输入框', LOG_LEVELS.INFO);
      }
    }
  });
}

// 初始化
initPopup();