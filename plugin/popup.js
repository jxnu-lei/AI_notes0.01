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

请按照以下步骤处理用户的笔记内容：
1. 内容分析：
   - 仔细阅读用户提供的笔记内容
   - 理解其主题、核心要点和关键信息
   - 识别内容的类型和性质
2. 内容整理：
   - 修正拼写、语法错误
   - 使用Markdown格式美化（标题、列表、代码块等）
   - 保持原意，使表达更清晰

3. 两级分类：
   - 一级分类：必须选择一个最适合的分类：
     - 技术开发类
     - 办公事务类
     - 计划想法类
     - 生活记录类
     - 其他
   
   - 二级分类：根据一级分类，根据笔记内容创建或选择一个更具体的子分类：
     - 技术开发类：python、javascript、GO、C++、数据库、算法、架构设计、XXX框架、Git技能学习笔记等
     - 办公事务类：公文写作、项目管理（如项目协调、任务分配）、工作纪要、账号网址备忘、工作计划等
     - 计划想法类：产品开发计划、项目规划、个人目标、创意灵感等
     - 生活记录类：日常感悟、旅行记录、美食日记、健康记录、杂书笔记等
     - 其他：以上都不适合，就根据内容创建合适的子分类

3. **内容提炼**：
   - 提取笔记的核心要点
   - 总结关键信息
   - 去除冗余内容

4. **格式要求**：
   - 分析完成后，返回结构化的JSON格式结果
   - 确保分类结果准确反映内容的实际性质
   - 确保二级分类与一级分类逻辑一致

5. **分类原则**：
   - 优先考虑内容的主要性质
   - 参考现有的分类体系
   - 保持分类的一致性和合理性

6. 文件名命名（noteType字段，非常重要！）：
   根据笔记的具体内容，生成一个简洁、有意义的文件名（2-8个汉字）。
   命名原则：
   - 如果是技术类笔记，文件名基本按基础、技巧、常见问题及解决思路这几个分类如：技术名词+基础（如python基础、GO基础）、技术名词+技巧（如python技巧）、技术名词+常见问题及解决思路（如python常见问题）
   - 反映笔记的核心主题或用途
   - 简洁明了，便于查找
   - 相似主题的笔记应使用相同的文件名，便于追加到同一文件
   
  示例：
     1.用户输入：“我最近计划开始学习一个新的技能，GIT，帮我创建一个GIT基础笔记”
       分类：'技术开发类' -> 'Git' 
       noteType：'Git基础'
     2.用户输入：“Go语言使用 var 关键字定义变量：”
       分类：'技术开发类' -> 'GO'
       noteType：'Go基础'

 返回格式（严格JSON，无Markdown包裹，无额外文本）
 
{
  "primaryCategory": "一级分类名称",
  "secondaryCategory": "二级分类名称",
  "noteType": "文件名（2-10个汉字，必填！根据上面的命名示例取名）",
  "formattedContent": "整理后的Markdown格式内容",
  "summary": "一句话摘要（20字以内）",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}`;
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
  // 构建最终传给AI的完整内容，与background.js中保持一致
  const finalPrompt = `${currentSystemPrompt}\n\n请处理以下内容：\n\n${content}`;
  log(`使用系统提示词处理消息，系统提示词长度: ${currentSystemPrompt.length} 字符`, LOG_LEVELS.DEBUG);
  log(`最终发给AI的完整内容: ${finalPrompt}`, LOG_LEVELS.DEBUG);
  
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
    log(`笔记存储成功，存储路径: ${response.data.path || '未知路径'}，文件名: ${response.data.filename || '未知文件名'}，分类: ${response.data.category || '未知分类'}`, LOG_LEVELS.INFO);
  } else {
    log(`笔记存储失败: ${response.error || '未知错误'}`, LOG_LEVELS.ERROR);
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

// 对话框调整大小功能的全局变量
let isResizing = false;
let startY = 0;
let startContainerHeight = 0;
let startInputHeight = 0;
let isManuallyResized = false;
let resizeHandle = null;

// 鼠标移动事件处理函数
function handleMouseMove(e) {
  if (!isResizing || !resizeHandle) return;
  
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
  const maxHeight = Math.floor(window.innerHeight * 2 / 3);
  
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
}

// 鼠标释放事件处理函数
function handleMouseUp() {
  if (isResizing) {
    console.log('Mouse up, input resizing stopped');
    isResizing = false;
  }
}

// 鼠标离开窗口事件处理函数
function handleMouseLeave() {
  if (isResizing) {
    console.log('Mouse left window, input resizing stopped');
    isResizing = false;
  }
}

// 初始化对话框调整大小功能
function initDialogResizeFunctionality() {
  console.log('Initializing dialog resize functionality...');
  
  if (!chatInputContainer) {
    console.error('Chat input container not found!');
    return;
  }
  
  console.log('Chat input container found:', chatInputContainer);
  
  // 移除任何现有的resizeHandle元素，避免重复添加
  const existingResizeHandles = chatInputContainer.querySelectorAll('[style*="cursor: ns-resize"]');
  existingResizeHandles.forEach(handle => handle.remove());
  console.log('Removed', existingResizeHandles.length, 'existing resize handles');
  
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
  resizeHandle = document.createElement('div');
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
  
  // 鼠标按下事件 - 保持透明
  resizeHandle.addEventListener('mousedown', (e) => {
    console.log('Mouse down on input resize handle');
    isResizing = true;
    startY = e.clientY;
    startContainerHeight = chatInputContainer.offsetHeight;
    startInputHeight = chatInput.offsetHeight;
    console.log('Start container height:', startContainerHeight, 'Start input height:', startInputHeight);
    
    // 阻止默认行为和事件冒泡
    e.preventDefault();
    e.stopPropagation();
  });
  
  // 重置所有状态
  isResizing = false;
  isManuallyResized = false;
  
  // 确保只添加一次window事件监听器
  // 先移除可能存在的旧监听器
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('mouseleave', handleMouseLeave);
  
  // 然后添加新的监听器
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('mouseleave', handleMouseLeave);
  
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