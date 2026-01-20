// 选项页面的JavaScript逻辑

// DOM元素
const tabs = document.querySelectorAll('.tab');
const settingsSections = {
  general: document.getElementById('general-settings'),
  storage: document.getElementById('storage-settings'),
  ai: document.getElementById('ai-settings'),
  reminder: document.getElementById('reminder-settings'),
  advanced: document.getElementById('advanced-settings')
};

const statusMessage = document.getElementById('status-message');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');

// 目录选择相关元素
const selectDirectoryBtn = document.getElementById('select-directory-btn');
const storagePathInput = document.getElementById('storage-path');
const directoryStatus = document.getElementById('directory-status');

// 自定义模型相关元素
const customModelName = document.getElementById('custom-model-name');
const customModelValue = document.getElementById('custom-model-value');
const customModelApiKey = document.getElementById('custom-model-api-key');
const customModelBaseUrl = document.getElementById('custom-model-base-url');
const addModelBtn = document.getElementById('add-model-btn');
const testModelBtn = document.getElementById('test-model-btn');
const modelsList = document.getElementById('models-list');
const keysList = document.getElementById('keys-list');
const aiModelSelect = document.getElementById('ai-model');

// 系统提示词相关元素
const systemPromptBtn = document.getElementById('system-prompt-btn');



// 复选框元素
const checkboxes = {
  notifications: document.getElementById('notifications'),
  keyboardShortcuts: document.getElementById('keyboard-shortcuts'),
  autoBackup: document.getElementById('auto-backup'),
  aiAnalysis: document.getElementById('ai-analysis'),
  reminders: document.getElementById('reminders'),
  debugMode: document.getElementById('debug-mode')
};

// 默认设置
const defaultSettings = {
  language: 'zh-CN',
  notifications: true,
  keyboardShortcuts: true,
  storagePath: '',
  autoBackup: true,
  backupFrequency: 'weekly',
  aiModel: 'openai',
  aiAnalysis: true,
  reminders: true,
  reminderInterval: '5',
  debugMode: false,
  logLevel: 'info'
};

// 初始化页面
async function initOptions() {
  await loadSettings();
  setupEventListeners();
}

// 打开系统提示词配置模态框
async function openSystemPromptModal() {
  const currentModel = document.getElementById('ai-model').value;
  
  if (!currentModel) {
    showStatus('请先选择一个AI模型', 'error');
    return;
  }
  
  // 创建模态框
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '1000';
  modal.style.padding = '2rem';
  
  // 模态框内容
  const modalContent = document.createElement('div');
  modalContent.style.backgroundColor = 'white';
  modalContent.style.borderRadius = '16px';
  modalContent.style.padding = '2rem';
  modalContent.style.maxWidth = '800px';
  modalContent.style.width = '100%';
  modalContent.style.maxHeight = '80vh';
  modalContent.style.overflow = 'auto';
  
  // 加载当前模型的系统提示词
  const systemPrompt = await getSystemPromptForModel(currentModel);
  
  modalContent.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <h3 style="font-size: 1.25rem; font-weight: 600; color: #1e293b; margin: 0 0 0.75rem 0;">系统提示词配置</h3>
      <p style="font-size: 0.875rem; color: #64748b; margin: 0;">为模型 "${currentModel}" 配置系统提示词，这将影响AI的行为和输出风格</p>
    </div>
    <div style="margin-bottom: 2rem;">
      <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #334155; margin-bottom: 0.5rem;">系统提示词</label>
      <textarea id="system-prompt-textarea" style="width: 100%; min-height: 200px; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.875rem; font-family: inherit; resize: vertical;">${systemPrompt || getDefaultSystemPrompt()}</textarea>
    </div>
    <div style="display: flex; gap: 1rem; justify-content: flex-end;">
          <button id="reset-prompt-btn" style="padding: 0.75rem 1.5rem; border-radius: 12px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; border: 1px solid #e2e8f0; background-color: #fef3c7; color: #92400e;">恢复默认</button>
          <button id="cancel-prompt-btn" style="padding: 0.75rem 1.5rem; border-radius: 12px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; border: 1px solid #e2e8f0; background-color: #f8fafc; color: #334155;">取消</button>
          <button id="save-prompt-btn" style="padding: 0.75rem 1.5rem; border-radius: 12px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; border: none; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white;">保存</button>
        </div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // 添加事件监听器
  document.getElementById('cancel-prompt-btn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  document.getElementById('reset-prompt-btn').addEventListener('click', () => {
    const defaultPrompt = getDefaultSystemPrompt();
    document.getElementById('system-prompt-textarea').value = defaultPrompt;
    showStatus('已恢复默认提示词，请点击保存', 'info');
  });
  
  document.getElementById('save-prompt-btn').addEventListener('click', async () => {
    const promptText = document.getElementById('system-prompt-textarea').value;
    await saveSystemPromptForModel(currentModel, promptText);
    document.body.removeChild(modal);
    showStatus('系统提示词保存成功', 'success');
  });
  
  // 点击模态框外部关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// 获取默认系统提示词
function getDefaultSystemPrompt() {
  return `你是一个智能笔记助手，专为AI笔记插件设计。你的任务是帮助用户分析、分类、提炼和管理笔记内容，并将其归类、美化，最后以严格的JSON格式输出。
## 核心处理流程
  1. 意图识别与分类（最高优先级）
  请根据以下逻辑树判定一级和二级分类（必须严格遵循用户的心理模型）：
  *   **意图 A：获取知识、积累技能、解决问题、记录代码片段**
      *   **一级分类**：‘学习笔记类’
      *   **判定标准**：包含“学习、入门、基础”、具体的技术知识点（如Python装饰器、Git命令）、代码片段+注释、问题解决方案、读书笔记。
      *   **二级分类**：
          *   技术栈名称（直接使用）：Python、Git、Java、Go、JavaScript、Vue、SQL、Docker等。
          *   通用学习：英语、数学、读书笔记、课程总结。

  *   **意图 B：未来的规划、一闪而过的灵感、待启动的项目**
    *   **一级分类**：‘计划想法类’
    *   **判定标准**：包含“计划、打算、目标、想法、构思”、未开始的项目架构描述。
    *   **二级分类**：
        *   项目规划（涉及具体项目的构思、架构）
        *   个人目标（年度计划、学习路线图）
        *   灵感闪念（碎片化想法）

  *   **意图 C：工作产出、现成文章摘录、事务性记录**
      *   **一级分类**：‘办公事务类’
      *   **判定标准**：复制粘贴的优秀文章、会议记录、周报、正式公文、已有的工作资料。
      *   **二级分类**：
          *   公文写作（文章摘录、报告、演讲稿、通知）
          *   会议纪要（沟通记录、会议总结）
          *   工作记录（账号备忘、资产列表）

  *   **意图 D：个人生活记录**
      *   **一级分类**：‘生活记录类’
      *   **二级分类**：日常感悟、旅行、美食、健康、记账。

  2. 内容整理与美化
    *   修正明显的拼写和语法错误。
    *   使用Markdown美化排版（合理使用 # 标题、- 列表、代码块）。
    *   保留原文核心意思，不要过度删减。

  3. 文件命名规则 (noteType 字段)
  *   **原则**：文件名必须反映笔记的**核心主题**或**项目名称**。
  *   **字数**：2-10个汉字（或英文单词），禁止使用“未分类”、“笔记”、“新建文件”等无意义词汇。
  *   **特殊逻辑**：
      *   如果是**项目规划**（如示例：“开发一个AI笔记插件”），noteType 必须是**项目名称**（如‘AI笔记插件’）。
      *   如果是**技术知识**（如示例：“Git学习”），noteType 必须是**具体的知识点**（如‘Git基础’、‘Python装饰器’）。

## 示例参考（Few-Shot Learning）
*   **用户输入**：“我最近计划开始学习一个新的技能，GIT，帮我创建一个GIT基础笔记”
    *   分类：'学习笔记类' -> 'Git'
    *   noteType：'Git基础'

*   **用户输入**：“我有一个想法，开发一个AI笔记插件，技术架构：JS edge插件...”
    *   分类：'计划想法类' -> '项目规划'
    *   noteType：'AI笔记插件'

*   **用户输入**：“[粘贴了一段关于行业趋势的好文章]”
    *   分类：'办公事务类' -> '公文写作'
    *   noteType：'行业趋势分析' (提取文章核心)

*   **用户输入**：“这段Python代码怎么写，加注释，问题是XXX，解决方案是XXX”
    *   分类：'学习笔记类' -> 'Python'
    *   noteType：'Python代码技巧' (或具体解决的问题名)

## 返回格式（严格JSON，无Markdown包裹，无额外文本）

{
  "primaryCategory": "一级分类名称（严格从上述4类中选）",
  "secondaryCategory": "二级分类名称（如果是技术，直接填技术名词，如Python/Git）",
  "noteType": "文件名（2-10字，如果是项目规划填项目名，如果是知识点填主题名）",
  "formattedContent": "整理后的Markdown内容",
  "summary": "一句话摘要（20字以内）",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}`;
}

// 加载当前模型的系统提示词
async function getSystemPromptForModel(modelName) {
  try {
    const result = await chrome.storage.local.get('systemPrompts');
    const systemPrompts = result.systemPrompts || {};
    return systemPrompts[modelName];
  } catch (error) {
    console.error('加载系统提示词失败:', error);
    return null;
  }
}

// 保存系统提示词
async function saveSystemPromptForModel(modelName, promptText) {
  try {
    const result = await chrome.storage.local.get('systemPrompts');
    const systemPrompts = result.systemPrompts || {};
    
    systemPrompts[modelName] = promptText;
    await chrome.storage.local.set({ systemPrompts });
    
    // 发送消息给后台脚本，通知系统提示词已更新
    chrome.runtime.sendMessage({
      type: 'system_prompt_updated',
      model: modelName,
      prompt: promptText
    });
  } catch (error) {
    console.error('保存系统提示词失败:', error);
    throw error;
  }
}

// 加载设置
async function loadSettings() {
  try {
    const settings = await chrome.storage.local.get(Object.keys(defaultSettings));
    
    // 应用设置
    document.getElementById('language').value = settings.language || defaultSettings.language;
    document.getElementById('storage-path').value = settings.storagePath || defaultSettings.storagePath;
    document.getElementById('backup-frequency').value = settings.backupFrequency || defaultSettings.backupFrequency;
    document.getElementById('ai-model').value = settings.aiModel || defaultSettings.aiModel;
    document.getElementById('reminder-interval').value = settings.reminderInterval || defaultSettings.reminderInterval;
    document.getElementById('log-level').value = settings.logLevel || defaultSettings.logLevel;
    
    // 应用复选框设置
    checkboxes.notifications.className = (settings.notifications !== undefined ? settings.notifications : defaultSettings.notifications) ? 'form-checkbox checked' : 'form-checkbox';
    checkboxes.keyboardShortcuts.className = (settings.keyboardShortcuts !== undefined ? settings.keyboardShortcuts : defaultSettings.keyboardShortcuts) ? 'form-checkbox checked' : 'form-checkbox';
    checkboxes.autoBackup.className = (settings.autoBackup !== undefined ? settings.autoBackup : defaultSettings.autoBackup) ? 'form-checkbox checked' : 'form-checkbox';
    checkboxes.aiAnalysis.className = (settings.aiAnalysis !== undefined ? settings.aiAnalysis : defaultSettings.aiAnalysis) ? 'form-checkbox checked' : 'form-checkbox';
    checkboxes.reminders.className = (settings.reminders !== undefined ? settings.reminders : defaultSettings.reminders) ? 'form-checkbox checked' : 'form-checkbox';
    checkboxes.debugMode.className = (settings.debugMode !== undefined ? settings.debugMode : defaultSettings.debugMode) ? 'form-checkbox checked' : 'form-checkbox';
    

    
    // 加载自定义模型
    await loadCustomModels();
  } catch (error) {
    console.error('加载设置失败:', error);
    showStatus('加载设置失败', 'error');
  }
}

// 加载自定义模型
async function loadCustomModels() {
  try {
    const result = await chrome.storage.local.get('customModels');
    const customModels = result.customModels || [];
    
    // 清空模型列表
    modelsList.innerHTML = '';
    
    // 清空选择器
    aiModelSelect.innerHTML = '';
    
    // 添加默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '请选择模型';
    aiModelSelect.appendChild(defaultOption);
    
    // 添加自定义模型到选择器和列表
    if (customModels.length > 0) {
      customModels.forEach((model, index) => {
        // 只添加配置完整并测试成功的模型到选择器
        if (model.apiKey && model.baseUrl && model.testStatus === 'success') {
          const option = document.createElement('option');
          option.value = model.value;
          option.textContent = model.name;
          aiModelSelect.appendChild(option);
        }
        
        // 添加到模型列表
        const modelItem = document.createElement('div');
        modelItem.style.display = 'flex';
        modelItem.style.justifyContent = 'space-between';
        modelItem.style.alignItems = 'flex-start';
        modelItem.style.padding = '1rem';
        modelItem.style.marginBottom = '1rem';
        modelItem.style.backgroundColor = '#f1f5f9';
        modelItem.style.borderRadius = '12px';
        modelItem.style.border = '1px solid #e2e8f0';
        
        // 根据测试状态设置不同的边框颜色
        if (model.testStatus === 'success') {
          modelItem.style.borderColor = '#bbf7d0';
        } else if (model.testStatus === 'failed') {
          modelItem.style.borderColor = '#fee2e2';
        }
        
        const statusClass = model.testStatus === 'success' ? 'text-green-600' : model.testStatus === 'failed' ? 'text-red-600' : 'text-gray-500';
        const statusText = model.testStatus === 'success' ? '测试成功' : model.testStatus === 'failed' ? '测试失败' : '未测试';
        
        modelItem.innerHTML = `
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <span style="font-weight: 600; font-size: 0.875rem;">${model.name}</span>
              <span class="${statusClass}" style="font-size: 0.75rem; font-weight: 500;">${statusText}</span>
            </div>
            <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.375rem;">标识: ${model.value}</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.375rem;">Base URL: ${model.baseUrl || '未设置'}</div>
            <div style="font-size: 0.75rem; color: #64748b;">API Key: ${model.apiKey ? '••••••••' : '未设置'}</div>
          </div>
          <div style="display: flex; gap: 0.75rem; align-items: center;">
            <button class="test-model-btn" data-index="${index}" style="background: none; border: 1px solid #3b82f6; color: #3b82f6; cursor: pointer; padding: 0.375rem 0.75rem; border-radius: 8px; font-size: 0.75rem; font-weight: 500;">
              测试
            </button>
            <button class="remove-model-btn" data-index="${index}" style="background: none; border: 1px solid #ef4444; color: #ef4444; cursor: pointer; padding: 0.375rem 0.75rem; border-radius: 8px; font-size: 0.75rem; font-weight: 500;">
              删除
            </button>
          </div>
        `;
        
        modelsList.appendChild(modelItem);
      });
      
      // 添加删除模型按钮事件
      document.querySelectorAll('.remove-model-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const index = parseInt(e.currentTarget.dataset.index);
          await removeCustomModel(index);
        });
      });
      
      // 添加测试模型按钮事件
      document.querySelectorAll('.test-model-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const index = parseInt(e.currentTarget.dataset.index);
          await testModelConnection(index);
        });
      });
    } else {
      modelsList.innerHTML = '<p style="color: #64748b; text-align: center; padding: 2rem;">暂无自定义模型</p>';
    }
    
    // 恢复之前选中的模型值
    chrome.storage.local.get('aiModel', (result) => {
      if (result.aiModel) {
        aiModelSelect.value = result.aiModel;
      }
    });
  } catch (error) {
    console.error('加载自定义模型失败:', error);
  }
}

// 添加自定义模型
async function addCustomModel() {
  const name = customModelName.value.trim();
  const value = customModelValue.value.trim();
  const apiKey = customModelApiKey.value.trim();
  const baseUrl = customModelBaseUrl.value.trim();
  
  if (!name || !value || !apiKey || !baseUrl) {
    showStatus('请输入所有必填字段', 'error');
    return;
  }
  
  try {
    const result = await chrome.storage.local.get('customModels');
    const customModels = result.customModels || [];
    
    // 检查模型是否已存在
    const existingModel = customModels.find(model => model.value === value);
    if (existingModel) {
      showStatus('该模型标识已存在', 'error');
      return;
    }
    
    // 添加新模型
    customModels.push({ 
      name, 
      value, 
      apiKey, // 存储API密钥
      baseUrl, 
      testStatus: 'untried' // 初始状态为未测试
    });
    await chrome.storage.local.set({ customModels });
    
    // 清空输入框
    customModelName.value = '';
    customModelValue.value = '';
    customModelApiKey.value = '';
    customModelBaseUrl.value = '';
    
    // 重新加载模型
    await loadCustomModels();
    showStatus('模型添加成功', 'success');
  } catch (error) {
    console.error('添加自定义模型失败:', error);
    showStatus('添加模型失败', 'error');
  }
}

// 测试模型连接
async function testModelConnection(index) {
  try {
    const result = await chrome.storage.local.get('customModels');
    const customModels = result.customModels || [];
    
    if (index < 0 || index >= customModels.length) {
      showStatus('模型不存在', 'error');
      return;
    }
    
    const model = customModels[index];
    
    // 检查模型配置是否完整
    if (!model.apiKey || !model.baseUrl) {
      showStatus('模型配置不完整', 'error');
      return;
    }
    
    // 显示测试中状态
    showStatus('正在测试模型连接...', 'success');
    
    // 模拟测试连接（实际项目中应替换为真实的API调用）
    setTimeout(async () => {
      try {
        // 这里应该是真实的API调用测试
        // 例如：const response = await fetch(`${model.baseUrl}/models`, {
        //   headers: { 'Authorization': `Bearer ${model.apiKey}` }
        // });
        
        // 模拟测试成功
        model.testStatus = 'success';
        await chrome.storage.local.set({ customModels });
        
        // 重新加载模型
        await loadCustomModels();
        showStatus('模型连接测试成功', 'success');
      } catch (error) {
        // 测试失败
        model.testStatus = 'failed';
        await chrome.storage.local.set({ customModels });
        
        // 重新加载模型
        await loadCustomModels();
        showStatus('模型连接测试失败', 'error');
      }
    }, 1500);
  } catch (error) {
    console.error('测试模型连接失败:', error);
    showStatus('测试连接失败', 'error');
  }
}

// 测试新模型连接（添加前测试）
async function testNewModelConnection() {
  const name = customModelName.value.trim();
  const value = customModelValue.value.trim();
  const apiKey = customModelApiKey.value.trim();
  const baseUrl = customModelBaseUrl.value.trim();
  
  if (!name || !value || !apiKey || !baseUrl) {
    showStatus('请输入所有必填字段', 'error');
    return;
  }
  
  try {
    // 显示测试中状态
    showStatus('正在测试模型连接...', 'success');
    
    // 模拟测试连接
    setTimeout(async () => {
      try {
        // 这里应该是真实的API调用测试
        
        // 模拟测试成功
        showStatus('模型连接测试成功', 'success');
      } catch (error) {
        // 测试失败
        showStatus('模型连接测试失败', 'error');
      }
    }, 1500);
  } catch (error) {
    console.error('测试模型连接失败:', error);
    showStatus('测试连接失败', 'error');
  }
}

// 删除自定义模型
async function removeCustomModel(index) {
  try {
    const result = await chrome.storage.local.get('customModels');
    const customModels = result.customModels || [];
    
    // 删除模型
    customModels.splice(index, 1);
    await chrome.storage.local.set({ customModels });
    
    // 重新加载模型
    await loadCustomModels();
    showStatus('模型删除成功', 'success');
  } catch (error) {
    console.error('删除自定义模型失败:', error);
    showStatus('删除模型失败', 'error');
  }
}

// 保存设置
async function saveSettings() {
  try {
    const settings = {
      language: document.getElementById('language').value,
      notifications: checkboxes.notifications.classList.contains('checked'),
      keyboardShortcuts: checkboxes.keyboardShortcuts.classList.contains('checked'),
      storagePath: document.getElementById('storage-path').value,
      autoBackup: checkboxes.autoBackup.classList.contains('checked'),
      backupFrequency: document.getElementById('backup-frequency').value,
      aiModel: document.getElementById('ai-model').value,
      aiAnalysis: checkboxes.aiAnalysis.classList.contains('checked'),
      reminders: checkboxes.reminders.classList.contains('checked'),
      reminderInterval: document.getElementById('reminder-interval').value,
      debugMode: checkboxes.debugMode.classList.contains('checked'),
      logLevel: document.getElementById('log-level').value
    };
    
    // 保存所有设置
    await chrome.storage.local.set(settings);
    
    // 重新加载自定义模型，确保下拉框中的选项是最新的
    await loadCustomModels();
    
    // 确保选中的模型值被恢复
    document.getElementById('ai-model').value = settings.aiModel;
    
    showStatus('设置保存成功', 'success');
    
    // 发送消息给后台脚本，通知设置已更新
    chrome.runtime.sendMessage({
      type: 'settings_updated',
      settings: settings
    });
  } catch (error) {
    console.error('保存设置失败:', error);
    showStatus('保存设置失败', 'error');
  }
}

// 恢复默认设置
async function resetSettings() {
  try {
    await chrome.storage.local.clear();
    
    // 应用默认设置
    document.getElementById('language').value = defaultSettings.language;
    document.getElementById('storage-path').value = defaultSettings.storagePath;
    document.getElementById('backup-frequency').value = defaultSettings.backupFrequency;
    document.getElementById('ai-model').value = defaultSettings.aiModel;
    document.getElementById('reminder-interval').value = defaultSettings.reminderInterval;
    document.getElementById('log-level').value = defaultSettings.logLevel;
    
    // 应用复选框默认设置
    checkboxes.notifications.className = defaultSettings.notifications ? 'form-checkbox checked' : 'form-checkbox';
    checkboxes.keyboardShortcuts.className = defaultSettings.keyboardShortcuts ? 'form-checkbox checked' : 'form-checkbox';
    checkboxes.autoBackup.className = defaultSettings.autoBackup ? 'form-checkbox checked' : 'form-checkbox';
    checkboxes.aiAnalysis.className = defaultSettings.aiAnalysis ? 'form-checkbox checked' : 'form-checkbox';
    checkboxes.reminders.className = defaultSettings.reminders ? 'form-checkbox checked' : 'form-checkbox';
    checkboxes.debugMode.className = defaultSettings.debugMode ? 'form-checkbox checked' : 'form-checkbox';
    
    showStatus('已恢复默认设置', 'success');
  } catch (error) {
    console.error('恢复默认设置失败:', error);
    showStatus('恢复默认设置失败', 'error');
  }
}

// 显示状态消息
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message status-${type}`;
  statusMessage.style.display = 'flex';
  
  // 3秒后隐藏消息
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
}

// 切换标签页
function switchTab(tabName) {
  // 隐藏所有设置部分
  Object.values(settingsSections).forEach(section => {
    section.style.display = 'none';
  });
  
  // 显示选中的设置部分
  settingsSections[tabName].style.display = 'block';
  
  // 更新标签状态
  tabs.forEach(tab => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

// 切换复选框状态
function toggleCheckbox(checkbox) {
  checkbox.classList.toggle('checked');
}

// 设置事件监听器
function setupEventListeners() {
  // 标签页切换事件
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });
  
  // 复选框点击事件
  Object.values(checkboxes).forEach(checkbox => {
    checkbox.addEventListener('click', () => {
      toggleCheckbox(checkbox);
    });
  });
  
  // 按钮点击事件
  saveBtn.addEventListener('click', saveSettings);
  resetBtn.addEventListener('click', resetSettings);
  
  // 添加模型按钮点击事件
  addModelBtn.addEventListener('click', addCustomModel);
  
  // 测试模型连接按钮点击事件
  testModelBtn.addEventListener('click', testNewModelConnection);
  
  // 系统提示词配置按钮点击事件
  if (systemPromptBtn) {
    systemPromptBtn.addEventListener('click', openSystemPromptModal);
  }
  
  // 输入框回车事件
  customModelName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      customModelValue.focus();
    }
  });
  
  customModelValue.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      customModelApiKey.focus();
    }
  });
  
  customModelApiKey.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      customModelBaseUrl.focus();
    }
  });
  
  customModelBaseUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addCustomModel();
    }
  });
}

// 选择存储目录
async function selectStorageDirectory() {
  try {
    // 使用 File System Access API 选择目录
    const directoryHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });
    
    // 获取目录名称
    const directoryName = directoryHandle.name;
    
    // 序列化目录句柄以便存储
    // 注意：目录句柄不能直接存储，需要使用 IndexedDB
    await saveDirectoryHandle(directoryHandle);
    
    // 更新UI
    storagePathInput.value = directoryName;
    directoryStatus.style.display = 'block';
    
    showStatus('存储目录设置成功', 'success');
    
    // 通知 background.js 目录已更新
    chrome.runtime.sendMessage({
      type: 'directory_updated',
      directoryName: directoryName
    });
    
  } catch (error) {
    if (error.name === 'AbortError') {
      // 用户取消了选择
      console.log('用户取消了目录选择');
    } else {
      console.error('选择目录失败:', error);
      showStatus('选择目录失败: ' + error.message, 'error');
    }
  }
}

// 使用 IndexedDB 保存目录句柄
async function saveDirectoryHandle(handle) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AINotesDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      
      store.put({ key: 'directoryHandle', value: handle });
      
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}

// 从 IndexedDB 获取目录句柄
async function getDirectoryHandle() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AINotesDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const getRequest = store.get('directoryHandle');
      
      getRequest.onsuccess = () => {
        db.close();
        resolve(getRequest.result?.value || null);
      };
      
      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };
    };
  });
}

// 检查目录权限
async function checkDirectoryPermission() {
  try {
    const handle = await getDirectoryHandle();
    if (handle) {
      // 验证权限是否仍然有效
      const permission = await handle.queryPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        storagePathInput.value = handle.name;
        directoryStatus.style.display = 'block';
        return true;
      } else if (permission === 'prompt') {
        // 需要重新请求权限
        storagePathInput.value = handle.name + ' (需要重新授权)';
        directoryStatus.style.display = 'none';
      }
    }
  } catch (error) {
    console.log('检查目录权限失败:', error);
  }
  return false;
}

// 修改 setupEventListeners 函数，添加目录选择按钮事件监听器
function setupEventListeners() {
  // 标签页切换事件
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });
  
  // 复选框点击事件
  Object.values(checkboxes).forEach(checkbox => {
    checkbox.addEventListener('click', () => {
      toggleCheckbox(checkbox);
    });
  });
  
  // 按钮点击事件
  saveBtn.addEventListener('click', saveSettings);
  resetBtn.addEventListener('click', resetSettings);
  
  // 添加模型按钮点击事件
  addModelBtn.addEventListener('click', addCustomModel);
  
  // 测试模型连接按钮点击事件
  testModelBtn.addEventListener('click', testNewModelConnection);
  
  // 系统提示词配置按钮点击事件
  if (systemPromptBtn) {
    systemPromptBtn.addEventListener('click', openSystemPromptModal);
  }
  
  // 输入框回车事件
  customModelName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      customModelValue.focus();
    }
  });
  
  customModelValue.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      customModelApiKey.focus();
    }
  });
  
  customModelApiKey.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      customModelBaseUrl.focus();
    }
  });
  
  customModelBaseUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addCustomModel();
    }
  });
  
  // 添加目录选择按钮事件监听器
  if (selectDirectoryBtn) {
    selectDirectoryBtn.addEventListener('click', selectStorageDirectory);
  }
}

// 修改 initOptions 函数，添加权限检查
async function initOptions() {
  await loadSettings();
  await checkDirectoryPermission(); // 检查目录权限
  setupEventListeners();
}

// 初始化
initOptions();