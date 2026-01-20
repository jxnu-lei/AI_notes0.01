// AI笔记插件后台脚本

// 全局变量
let notes = [];
let contextMenuCreated = false;

// 初始化函数
function init() {
  // 加载存储的笔记
  loadNotes();
  
  // 创建上下文菜单
  createContextMenus();
  
  // 监听消息
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // 监听键盘快捷键
  chrome.commands.onCommand.addListener(handleCommand);
  
  // 监听安装和更新
  chrome.runtime.onInstalled.addListener(handleInstalled);
}

// 处理安装和更新事件
function handleInstalled(details) {
  console.log('AI笔记插件已安装/更新:', details.reason);
  
  // 创建上下文菜单
  createContextMenus();
  
  // 显示欢迎通知
  if (details.reason === 'install') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"%3E%3Cpath fill="%236366f1" d="M9 3v42h30V18l-9-9H9zm0 3h21v9h9v30H9V6zm18 3H15v30h12V12z"/%3E%3C/svg%3E',
      title: 'AI笔记插件已安装',
      message: '开始使用AI笔记插件采集和管理您的笔记',
      buttons: [
        {
          title: '打开选项页面'
        }
      ]
    }, (notificationId) => {
      // 监听通知点击
      chrome.notifications.onButtonClicked.addListener((id, index) => {
        if (id === notificationId && index === 0) {
          chrome.runtime.openOptionsPage();
        }
      });
    });
  }
}

// 创建上下文菜单
function createContextMenus() {
  if (contextMenuCreated) {
    chrome.contextMenus.removeAll();
  }
  
  // 创建主菜单
  chrome.contextMenus.create({
    id: 'ai-note-main',
    title: 'AI笔记',
    contexts: ['selection', 'page']
  });
  
  // 创建子菜单
  chrome.contextMenus.create({
    id: 'ai-note-capture',
    parentId: 'ai-note-main',
    title: '采集到笔记',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'ai-note-copy',
    parentId: 'ai-note-main',
    title: '复制',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'ai-note-highlight',
    parentId: 'ai-note-main',
    title: '高亮',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'ai-note-separator',
    parentId: 'ai-note-main',
    type: 'separator',
    contexts: ['selection', 'page']
  });
  
  chrome.contextMenus.create({
    id: 'ai-note-open',
    parentId: 'ai-note-main',
    title: '打开笔记插件',
    contexts: ['selection', 'page']
  });
  
  chrome.contextMenus.create({
    id: 'ai-note-options',
    parentId: 'ai-note-main',
    title: '选项',
    contexts: ['selection', 'page']
  });
  
  // 监听上下文菜单点击
  chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
  
  contextMenuCreated = true;
}

// 处理上下文菜单点击
function handleContextMenuClick(info, tab) {
  switch (info.menuItemId) {
    case 'ai-note-capture':
      if (info.selectionText) {
        // 采集选中文本，传递tabId参数
        captureText({
          text: info.selectionText,
          url: info.pageUrl,
          title: tab.title,
          timestamp: new Date().toISOString()
        }, tab.id);
      }
      break;
    
    case 'ai-note-copy':
      if (info.selectionText) {
        // 复制文本
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (text) => {
            navigator.clipboard.writeText(text);
            window.AINotePlugin.showNotification('成功', '文本已复制到剪贴板', 'success');
          },
          args: [info.selectionText]
        });
      }
      break;
    
    case 'ai-note-highlight':
      if (info.selectionText) {
        // 高亮文本
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const selectedText = selection.toString();
              const span = document.createElement('span');
              span.className = 'ai-note-selection-highlight';
              span.textContent = selectedText;
              range.deleteContents();
              range.insertNode(span);
              window.AINotePlugin.showNotification('成功', '文本已高亮', 'success');
            }
          }
        });
      }
      break;
    
    case 'ai-note-open':
      // 打开插件侧边栏
      chrome.sidePanel.open({ tabId: tab.id });
      break;
    
    case 'ai-note-options':
      // 打开选项页面
      chrome.runtime.openOptionsPage();
      break;
  }
}

// 处理消息
function handleMessage(message, sender, sendResponse) {
  switch (message.action) {
    case 'captureText':
      // 采集文本
      captureText(message.data);
      sendResponse({ success: true });
      break;
    
    case 'getNotes':
      // 获取笔记列表
      sendResponse({ success: true, data: notes });
      break;
    
    case 'addNote':
      // 添加笔记
      const newNote = addNote(message.data);
      sendResponse({ success: true, data: newNote });
      break;
    
    case 'updateNote':
      // 更新笔记
      const updatedNote = updateNote(message.data.id, message.data);
      sendResponse({ success: true, data: updatedNote });
      break;
    
    case 'deleteNote':
      // 删除笔记
      const deleted = deleteNote(message.data.id);
      sendResponse({ success: deleted });
      break;
    
    case 'openSidePanel':
      // 打开侧边栏
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.sidePanel.open({ tabId: tabs[0].id });
        }
      });
      sendResponse({ success: true });
      break;
      
    case 'storeNoteWithClassification':
      // 处理并存储笔记（带AI分类）
      storeNoteWithClassification(message.data)
        .then((result) => {
          sendResponse({ success: true, data: result });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
      
    case 'processMessageWithAI':
      // 处理AI消息
      processMessageWithAI(message.data)
        .then((result) => {
          sendResponse({ success: true, data: result });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
      
    default:
      sendResponse({ success: false, error: '未知操作' });
  }
}

// 处理AI消息
async function processMessageWithAI(data) {
  try {
    const { content, systemPrompt } = data;
    
    console.log('开始处理AI消息:', content);
    
    // 获取当前选择的AI模型
    const modelResult = await new Promise(resolve => {
      chrome.storage.local.get('aiModel', resolve);
    });
    const aiModel = modelResult.aiModel || 'openai';
    console.log('使用的AI模型:', aiModel);
    
    // 生成AI提示词
    const prompt = `${systemPrompt}\n\n请处理以下内容：\n\n${content}`;
    
    // 调用AI模型
    const aiResponse = await callAIModel(aiModel, prompt);
    console.log('AI模型响应:', aiResponse);
    
    return aiResponse;
  } catch (error) {
    console.error('处理AI消息失败:', error);
    throw error;
  }
}

// offscreen 文档管理
let offscreenDocumentCreated = false;

// 确保 offscreen 文档存在
async function ensureOffscreenDocument() {
  if (offscreenDocumentCreated) return;
  
  try {
    // 检查是否已存在
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    
    if (existingContexts.length > 0) {
      offscreenDocumentCreated = true;
      return;
    }
    
    // 创建 offscreen 文档
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER'], // 或其他合适的原因
      justification: '用于文件系统操作'
    });
    
    offscreenDocumentCreated = true;
  } catch (error) {
    console.error('创建 offscreen 文档失败:', error);
  }
}

// 通过 offscreen 文档保存笔记
async function saveNoteViaOffscreen(noteData) {
  await ensureOffscreenDocument();
  
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      target: 'offscreen',
      action: 'saveNote',
      data: noteData
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error || '保存失败'));
      }
    });
  });
}

// 检查文件系统权限
async function checkFileSystemPermission() {
  await ensureOffscreenDocument();
  
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      target: 'offscreen',
      action: 'checkPermission'
    }, (response) => {
      resolve(response?.hasPermission || false);
    });
  });
}

// 处理并存储笔记（带AI分类）
async function storeNoteWithClassification(data) {
  try {
    const { userInput, aiResponse, classification } = data;
    
    console.log('开始处理笔记存储:', data);
    
    // 1. 检查文件系统权限
    const hasPermission = await checkFileSystemPermission();
    if (!hasPermission) {
      throw new Error('未设置存储目录或权限已过期，请在设置中重新选择存储目录');
    }
    
    // 2. 检查AI响应是否已经包含分类信息或直接提供了分类
    let finalClassification;
    
    // 检查是否直接提供了分类信息（用于后续重试或手动分类场景）
    if (classification && classification.primaryCategory && classification.secondaryCategory) {
      console.log('使用直接提供的分类信息:', classification);
      finalClassification = classification;
    } 
    // 检查AI响应是否包含分类信息
    else if (aiResponse) {
      try {
        // 尝试从AI响应中提取分类信息
        // 移除可能的代码块标记
        const cleanedResponse = aiResponse.replace(/^```json\s*|\s*```$/g, '');
        // 进一步清理：只保留JSON部分
        const jsonStart = cleanedResponse.indexOf('{');
        const jsonEnd = cleanedResponse.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonOnly = cleanedResponse.substring(jsonStart, jsonEnd + 1);
          const parsedResponse = JSON.parse(jsonOnly);
          
          // 检查是否包含完整的分类信息
          if (parsedResponse.primaryCategory && parsedResponse.secondaryCategory) {
            // 验证 noteType 是否有效
            let noteType = parsedResponse.noteType;
            if (!noteType || noteType === '未分类笔记' || noteType === '未分类' || noteType.length < 2) {
              // 自动生成 noteType
              noteType = generateNoteTypeFromContent(parsedResponse);
            }
            
            finalClassification = {
              primaryCategory: parsedResponse.primaryCategory,
              secondaryCategory: parsedResponse.secondaryCategory,
              noteType: noteType,
              formattedContent: parsedResponse.formattedContent || userInput,
              summary: parsedResponse.summary || '',
              keywords: parsedResponse.keywords || []
            };
            console.log('从AI响应中提取分类信息:', finalClassification);
          }
        }
      } catch (error) {
        console.error('解析AI响应中的分类信息失败:', error);
      }
    }
    
    // 3. 如果没有获取到分类信息，使用本地快速分类
    if (!finalClassification) {
      console.log('使用本地快速分类');
      // 基于内容的简单分类逻辑（避免依赖AI模型）
      const simpleClassification = await simpleClassifyContent(userInput);
      finalClassification = {
        primaryCategory: simpleClassification.primaryCategory,
        secondaryCategory: simpleClassification.secondaryCategory,
        noteType: simpleClassification.noteType,
        formattedContent: userInput,
        summary: generateSimpleSummary(userInput),
        keywords: extractSimpleKeywords(userInput)
      };
      console.log('本地快速分类结果:', finalClassification);
    }
    
    // 3. 生成笔记内容 - 使用AI整理后的内容，避免重复
    const formattedContent = finalClassification.formattedContent || userInput;
    const noteContent = `# 笔记\n\n## 整理后的内容\n${formattedContent}\n\n## 分类信息\n- **一级分类**: ${finalClassification.primaryCategory}\n- **二级分类**: ${finalClassification.secondaryCategory}\n\n## 核心要点\n${finalClassification.summary || '无'}\n\n## 关键词\n${finalClassification.keywords.length > 0 ? finalClassification.keywords.map(keyword => `- ${keyword}`).join('\n') : '无'}\n\n## 存储时间\n${new Date().toLocaleString('zh-CN')}`;
    console.log('生成的笔记内容:', noteContent);
    
    // 4. 生成笔记标题
    const noteTitle = generateNoteTitle(userInput);
    
    // 5. 通过 offscreen 文档保存到文件系统
    const result = await saveNoteViaOffscreen({
      primaryCategory: finalClassification.primaryCategory,
      secondaryCategory: finalClassification.secondaryCategory,
      noteContent: noteContent,
      noteType: finalClassification.noteType || '临时笔记',
      summary: finalClassification.summary || '',
      keywords: finalClassification.keywords || []
    });
    
    console.log('文件系统保存结果:', result);
    
    // 6. 保存到Chrome存储
    const notesResult = await new Promise(resolve => {
      chrome.storage.local.get('aiNotes', resolve);
    });
    const notes = notesResult.aiNotes || [];
    
    const newNote = {
      id: Date.now().toString(),
      title: finalClassification.secondaryCategory,
      content: noteContent,
      url: '',
      source: '',
      timestamp: new Date().toISOString(),
      tags: [],
      category: `${finalClassification.primaryCategory}/${finalClassification.secondaryCategory}`,
      storagePath: result.filePath
    };
    
    notes.unshift(newNote);
    await new Promise(resolve => {
      chrome.storage.local.set({ aiNotes: notes }, resolve);
    });
    console.log('笔记已保存到Chrome存储:', newNote.id);
    
    // 7. 显示通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"%3E%3Cpath fill="%236366f1" d="M9 3v42h30V18l-9-9H9zm0 3h21v9h9v30H9V6zm18 3H15v30h12V12z"/%3E%3C/svg%3E',
      title: '笔记已存储',
      message: `已存储到: ${finalClassification.primaryCategory}/${finalClassification.secondaryCategory}`
    });
    console.log('通知已显示');
    
    return {
      classification: finalClassification,
      storagePath: result.filePath,
      noteId: newNote.id
    };
  } catch (error) {
    console.error('存储笔记失败:', error);
    throw error;
  }
}

// 处理键盘快捷键
function handleCommand(command) {
  switch (command) {
    case 'capture-selection':
      // 采集选中文本
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              const selection = window.getSelection();
              const selectedText = selection.toString().trim();
              if (selectedText) {
                window.AINotePlugin.captureSelection();
              }
            }
          });
        }
      });
      break;
    case '_execute_side_panel':
      // 打开侧边栏
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.sidePanel.open({ tabId: tabs[0].id });
        }
      });
      break;
  }
}

// 监听扩展图标点击
chrome.action.onClicked.addListener((tab) => {
  console.log('工具栏按钮被点击');
  
  // 向 content script 发送消息，让它获取选中文本并触发采集
  chrome.tabs.sendMessage(tab.id, {
    action: 'toolbarCapture'
  }).catch((err) => {
    console.log('发送消息失败，直接打开侧边栏');
    // 如果 content script 不可用，直接打开侧边栏
    chrome.sidePanel.open({ tabId: tab.id });
  });
});

// 加载笔记
function loadNotes() {
  chrome.storage.local.get('aiNotes', (result) => {
    if (result.aiNotes) {
      notes = result.aiNotes;
    } else {
      notes = [];
      // 存储默认笔记
      chrome.storage.local.set({ aiNotes: notes });
    }
  });
}

// 保存笔记
function saveNotes() {
  chrome.storage.local.set({ aiNotes: notes });
}

// 采集文本
function captureText(data, tabId) {
  // ✅ 先存储数据（不等待回调）
  chrome.storage.local.set({
    capturedText: data.text
  });
  
  // ✅ 直接在用户手势上下文中打开侧边栏（最优先执行）
  const targetTabId = tabId || (data.tabId);
  
  if (targetTabId) {
    // ✅ 使用 Promise 方式调用
    chrome.sidePanel.open({ tabId: targetTabId })
      .then(() => {
        // 侧边栏打开后，延迟发送消息（等待侧边栏加载完成）
        setTimeout(() => {
          chrome.runtime.sendMessage({
            action: 'appendCapturedText',
            data: {
              text: data.text
            }
          }).catch(() => {
            // 如果发送失败，侧边栏会从 storage 读取
            console.log('消息发送失败，侧边栏将从storage读取');
          });
        }, 300);
      })
      .catch((err) => {
        console.error('打开侧边栏失败:', err);
      });
  } else {
    // 如果没有提供tabId，查询当前活动标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // ✅ 使用 Promise 方式调用
        chrome.sidePanel.open({ tabId: tabs[0].id })
          .then(() => {
            // 侧边栏打开后，延迟发送消息（等待侧边栏加载完成）
            setTimeout(() => {
              chrome.runtime.sendMessage({
                action: 'appendCapturedText',
                data: {
                  text: data.text
                }
              }).catch(() => {
                // 如果发送失败，侧边栏会从 storage 读取
                console.log('消息发送失败，侧边栏将从storage读取');
              });
            }, 300);
          })
          .catch((err) => {
            console.error('打开侧边栏失败:', err);
          });
      }
    });
  }
  
  // 其他操作（在后台执行，不影响用户手势上下文）
  // 创建新笔记
  const note = {
    id: Date.now().toString(),
    title: generateNoteTitle(data.text),
    content: data.text,
    url: data.url,
    source: data.title,
    timestamp: data.timestamp,
    tags: [],
    category: '未分类'
  };
  
  // 添加到笔记列表
  notes.unshift(note);
  
  // 保存笔记
  saveNotes();
  
  // 显示通知
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"%3E%3Cpath fill="%2310b981" d="M9 3v42h30V18l-9-9H9zm0 3h21v9h9v30H9V6zm18 3H15v30h12V12z"/%3E%3C/svg%3E',
    title: '文本已采集',
    message: `已采集到笔记: ${note.title}`
  });
}

// 生成笔记标题
function generateNoteTitle(text) {
  // 截取前50个字符作为标题
  const title = text.substring(0, 50);
  return title.endsWith(' ') ? title.trim() : title;
}

// 添加笔记
function addNote(data) {
  const note = {
    id: Date.now().toString(),
    title: data.title || '无标题',
    content: data.content || '',
    url: data.url || '',
    source: data.source || '',
    timestamp: data.timestamp || new Date().toISOString(),
    tags: data.tags || [],
    category: data.category || '未分类'
  };
  
  notes.unshift(note);
  saveNotes();
  return note;
}

// 更新笔记
function updateNote(id, data) {
  const index = notes.findIndex(note => note.id === id);
  if (index !== -1) {
    notes[index] = {
      ...notes[index],
      ...data
    };
    saveNotes();
    return notes[index];
  }
  return null;
}

// 删除笔记
function deleteNote(id) {
  const index = notes.findIndex(note => note.id === id);
  if (index !== -1) {
    notes.splice(index, 1);
    saveNotes();
    return true;
  }
  return false;
}

// AI分类函数
async function classifyNote(content) {
  try {
    // 获取当前选择的AI模型
    const modelResult = await new Promise(resolve => {
      chrome.storage.local.get('aiModel', resolve);
    });
    const aiModel = modelResult.aiModel || 'openai';
    
    // 获取系统提示词
    const promptResult = await new Promise(resolve => {
      chrome.storage.local.get('systemPrompts', resolve);
    });
    const systemPrompts = promptResult.systemPrompts || {};
    const systemPrompt = systemPrompts[aiModel] || getDefaultClassificationPrompt();
    
    // 生成分类提示词
    const classificationPrompt = generateClassificationPrompt(content, systemPrompt);
    
    // 调用AI模型
    const response = await callAIModel(aiModel, classificationPrompt);
    
    // 解析分类结果
    return parseClassificationResult(response);
  } catch (error) {
    console.error('分类笔记失败:', error);
    // 返回默认分类
    return {
      primaryCategory: '未分类',
      secondaryCategory: '其他',
      noteType: '未分类笔记',
      summary: '',
      keywords: []
    };
  }
}

// 获取默认分类提示词
function getDefaultClassificationPrompt() {
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
}

`;
}

// 生成分类提示词
function generateClassificationPrompt(content, systemPrompt) {
  return `${systemPrompt}\n\n请分类以下笔记内容：\n\n${content}`;
}

// 调用AI模型
async function callAIModel(model, prompt) {
  try {
    // 获取模型配置
    const [modelsResult, apiKeysResult] = await Promise.all([
      chrome.storage.local.get('customModels'),
      chrome.storage.local.get('apiKeys')
    ]);
    const customModels = modelsResult.customModels || [];
    const apiKeys = apiKeysResult.apiKeys || {};
    
    // 查找对应模型的配置
    const modelConfig = customModels.find(m => m.value === model);
    
    // 根据不同的模型使用不同的API调用
    switch (model) {
      case 'openai':
        return await callOpenAIModel(prompt, modelConfig, apiKeys.openai);
      case 'claude':
        return await callClaudeModel(prompt, modelConfig, apiKeys.claude);
      case 'gemini':
        return await callGeminiModel(prompt, modelConfig, apiKeys.gemini);
      case 'local':
        return await callLocalModel(prompt, modelConfig);
      default:
        // 检查是否是自定义模型
        if (modelConfig && modelConfig.apiKey && modelConfig.baseUrl) {
          return await callCustomModel(prompt, modelConfig);
        }
        throw new Error(`不支持的模型: ${model}`);
    }
  } catch (error) {
    console.error('调用AI模型失败:', error);
    throw error;
  }
}

// 调用OpenAI模型
async function callOpenAIModel(prompt, modelConfig, apiKey) {
  try {
    if (!apiKey) {
      throw new Error('OpenAI API密钥未配置');
    }
    
    // 使用模型配置或默认值
    const baseUrl = modelConfig?.baseUrl || 'https://api.openai.com/v1';
    const model = modelConfig?.model || 'gpt-3.5-turbo';
    
    // 发送请求到OpenAI API
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API请求失败: ${response.status} ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('调用OpenAI模型失败:', error);
    throw error;
  }
}

// 调用Claude模型
async function callClaudeModel(prompt, modelConfig, apiKey) {
  try {
    if (!apiKey) {
      throw new Error('Claude API密钥未配置');
    }
    
    // 使用模型配置或默认值
    const baseUrl = modelConfig?.baseUrl || 'https://api.anthropic.com/v1';
    const model = modelConfig?.model || 'claude-3-sonnet-20240229';
    
    // 发送请求到Claude API
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`Claude API请求失败: ${response.status} ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('调用Claude模型失败:', error);
    throw error;
  }
}

// 调用Gemini模型
async function callGeminiModel(prompt, modelConfig, apiKey) {
  try {
    if (!apiKey) {
      throw new Error('Gemini API密钥未配置');
    }
    
    // 使用模型配置或默认值
    const baseUrl = modelConfig?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    const model = modelConfig?.model || 'models/gemini-1.0-pro';
    
    // 发送请求到Gemini API
    const response = await fetch(`${baseUrl}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API请求失败: ${response.status} ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('调用Gemini模型失败:', error);
    throw error;
  }
}

// 调用本地模型
async function callLocalModel(prompt, modelConfig) {
  try {
    // 使用模型配置或默认值
    const baseUrl = modelConfig?.baseUrl || 'http://localhost:11434';
    const model = modelConfig?.model || 'llama3';
    
    // 发送请求到本地模型API
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`本地模型API请求失败: ${response.status} ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('调用本地模型失败:', error);
    throw error;
  }
}

// 调用自定义模型
async function callCustomModel(prompt, modelConfig) {
  try {
    if (!modelConfig.apiKey) {
      throw new Error('自定义模型API密钥未配置');
    }
    
    // 使用模型配置
    const baseUrl = modelConfig.baseUrl;
    // 使用model字段或fallback到value字段作为模型名称
    const model = modelConfig.model || modelConfig.value;
    
    // 检查模型名称是否配置
    if (!model) {
      throw new Error('自定义模型名称未配置');
    }
    
    // 发送请求到自定义模型API
    // 这里假设自定义模型使用类似OpenAI的Chat Completions API格式
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelConfig.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`自定义模型API请求失败: ${response.status} ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('调用自定义模型失败:', error);
    throw error;
  }
}



// 解析分类结果
function parseClassificationResult(response) {
  try {
    // 尝试提取 JSON
    let jsonStr = response;
    
    // 移除可能的 markdown 代码块标记
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    // 清理可能的前后空白和非JSON字符
    jsonStr = jsonStr.trim();
    
    // 尝试找到JSON对象的开始和结束
    const startIndex = jsonStr.indexOf('{');
    const endIndex = jsonStr.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      jsonStr = jsonStr.substring(startIndex, endIndex + 1);
    }
    
    const result = JSON.parse(jsonStr);
    
    // 生成 noteType（如果AI没有返回或返回了无效值）
    let noteType = result.noteType;
    if (!noteType || noteType === '未分类笔记' || noteType === '未分类' || noteType.length < 2) {
      // 自动生成 noteType
      noteType = generateNoteTypeFromContent(result);
    }
    
    return {
      primaryCategory: result.primaryCategory || '未分类',
      secondaryCategory: result.secondaryCategory || '其他',
      noteType: noteType,
      formattedContent: result.formattedContent || '',
      summary: result.summary || '',
      keywords: result.keywords || []
    };
  } catch (error) {
    console.error('解析分类结果失败:', error);
    console.error('原始响应:', response);
    return {
      primaryCategory: '未分类',
      secondaryCategory: '其他',
      noteType: '临时笔记',
      formattedContent: '',
      summary: '',
      keywords: []
    };
  }
}

// 根据内容自动生成文件名
function generateNoteTypeFromContent(result) {
  // 优先使用摘要生成文件名
  if (result.summary && result.summary.length > 0) {
    // 提取摘要的前8个字符作为文件名
    let noteType = result.summary.replace(/[\\/:*?"<>|\s]/g, '').substring(0, 8);
    if (noteType.length >= 2) {
      return noteType;
    }
  }
  
  // 其次使用关键词
  if (result.keywords && result.keywords.length > 0) {
    const keyword = result.keywords[0].replace(/[\\/:*?"<>|\s]/g, '').substring(0, 8);
    if (keyword.length >= 2) {
      return keyword;
    }
  }
  
  // 根据分类生成默认文件名
  const categoryDefaults = {
    '技术开发类': '开发笔记',
    '公文写作类': '文档记录',
    '计划想法类': '计划想法',
    '学习笔记类': '学习笔记',
    '生活记录类': '生活记录',
    '其他': '日常记录'
  };
  
  return categoryDefaults[result.primaryCategory] || '日常记录';
}

// 本地快速分类函数，当AI分类失败时使用
async function simpleClassifyContent(content) {
  try {
    // 简单的关键词匹配分类
    const lowerContent = content.toLowerCase();
    
    // 技术开发类关键词
    const techKeywords = ['python', 'javascript', 'java', 'go', '数据库', '算法', '开发', '编程', '代码', '软件', '前端', '后端', '框架', '库', 'api', '工具'];
    // 公文写作类关键词
    const docKeywords = ['通知', '报告', '总结', '演讲稿', '会议记录', '公文', '写作', '模板', '范文'];
    // 计划想法类关键词
    const planKeywords = ['计划', '想法', '规划', '目标', '项目', '产品', '方案', '设计'];
    // 学习笔记类关键词
    const studyKeywords = ['学习', '笔记', '课程', '读书', '知识', '数学', '英语', '专业', '考试'];
    // 生活记录类关键词
    const lifeKeywords = ['生活', '感悟', '旅行', '美食', '健康', '日常', '日记', '记录'];
    
    // 确定一级分类
    let primaryCategory = '其他';
    if (techKeywords.some(keyword => lowerContent.includes(keyword))) {
      primaryCategory = '技术开发类';
    } else if (docKeywords.some(keyword => lowerContent.includes(keyword))) {
      primaryCategory = '公文写作类';
    } else if (planKeywords.some(keyword => lowerContent.includes(keyword))) {
      primaryCategory = '计划想法类';
    } else if (studyKeywords.some(keyword => lowerContent.includes(keyword))) {
      primaryCategory = '学习笔记类';
    } else if (lifeKeywords.some(keyword => lowerContent.includes(keyword))) {
      primaryCategory = '生活记录类';
    }
    
    // 确定二级分类
    let secondaryCategory = '其他';
    switch (primaryCategory) {
      case '技术开发类':
        if (lowerContent.includes('python')) secondaryCategory = 'python';
        else if (lowerContent.includes('javascript') || lowerContent.includes('js')) secondaryCategory = 'javascript';
        else if (lowerContent.includes('java')) secondaryCategory = 'java';
        else if (lowerContent.includes('go')) secondaryCategory = 'go';
        else if (lowerContent.includes('数据库') || lowerContent.includes('sql')) secondaryCategory = '数据库';
        else if (lowerContent.includes('算法')) secondaryCategory = '算法';
        else if (lowerContent.includes('前端')) secondaryCategory = '前端';
        else if (lowerContent.includes('后端')) secondaryCategory = '后端';
        else if (lowerContent.includes('工具')) secondaryCategory = '工具使用';
        break;
      case '公文写作类':
        if (lowerContent.includes('通知')) secondaryCategory = '通知';
        else if (lowerContent.includes('报告')) secondaryCategory = '报告';
        else if (lowerContent.includes('总结')) secondaryCategory = '总结';
        else if (lowerContent.includes('会议')) secondaryCategory = '会议记录';
        break;
      case '计划想法类':
        if (lowerContent.includes('产品')) secondaryCategory = '产品计划';
        else if (lowerContent.includes('项目')) secondaryCategory = '项目规划';
        else if (lowerContent.includes('目标')) secondaryCategory = '个人目标';
        break;
      case '学习笔记类':
        if (lowerContent.includes('数学')) secondaryCategory = '数学';
        else if (lowerContent.includes('英语')) secondaryCategory = '英语';
        else if (lowerContent.includes('读书')) secondaryCategory = '读书笔记';
        else if (lowerContent.includes('课程')) secondaryCategory = '专业课程';
        break;
      case '生活记录类':
        if (lowerContent.includes('感悟')) secondaryCategory = '日常感悟';
        else if (lowerContent.includes('旅行')) secondaryCategory = '旅行';
        else if (lowerContent.includes('美食')) secondaryCategory = '美食';
        else if (lowerContent.includes('健康')) secondaryCategory = '健康';
        break;
    }
    
    // 生成简单的noteType
    let noteType = '临时笔记';
    switch (primaryCategory) {
      case '技术开发类':
        noteType = '开发笔记';
        break;
      case '公文写作类':
        noteType = '文档记录';
        break;
      case '计划想法类':
        noteType = '计划想法';
        break;
      case '学习笔记类':
        noteType = '学习笔记';
        break;
      case '生活记录类':
        noteType = '生活记录';
        break;
    }
    
    return {
      primaryCategory: primaryCategory,
      secondaryCategory: secondaryCategory,
      noteType: noteType
    };
  } catch (error) {
    console.error('本地快速分类失败:', error);
    return {
      primaryCategory: '其他',
      secondaryCategory: '其他',
      noteType: '临时笔记'
    };
  }
}

// 生成简单摘要
function generateSimpleSummary(content) {
  // 简单提取前50个字符作为摘要
  return content.substring(0, 50).trim() + (content.length > 50 ? '...' : '');
}

// 简单提取关键词
function extractSimpleKeywords(content) {
  // 简单提取前3个可能的关键词
  try {
    // 移除标点符号和多余空格
    const cleaned = content.replace(/[\s\p{Punctuation}]+/gu, ' ').trim();
    // 分割为单词
    const words = cleaned.split(' ');
    // 过滤掉短单词和常见词
    const commonWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'];
    const keywords = words
      .filter(word => word.length > 1 && !commonWords.includes(word))
      .slice(0, 3);
    return keywords;
  } catch (error) {
    console.error('提取关键词失败:', error);
    return [];
  }
}





// 初始化插件
init();