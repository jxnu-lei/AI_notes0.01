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
        console.log('原始AI响应内容:', aiResponse);
        
        // 尝试从AI响应中提取分类信息
        // 移除可能的代码块标记
        const cleanedResponse = aiResponse.replace(/^```json\s*|\s*```$/g, '');
        console.log('移除代码块标记后:', cleanedResponse);
        
        // 进一步清理：只保留JSON部分
        const jsonStart = cleanedResponse.indexOf('{');
        console.log('JSON开始位置:', jsonStart);
        
        if (jsonStart !== -1) {
          // 寻找最外层的JSON结束位置，考虑嵌套结构
          let braceCount = 0;
          let jsonEnd = -1;
          for (let i = jsonStart; i < cleanedResponse.length; i++) {
            const char = cleanedResponse[i];
            if (char === '{') {
              braceCount++;
            } else if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                jsonEnd = i;
                break;
              }
            }
          }
          
          console.log('JSON结束位置:', jsonEnd);
          
          if (jsonEnd !== -1) {
            const jsonOnly = cleanedResponse.substring(jsonStart, jsonEnd + 1);
            console.log('精确提取的JSON内容:', jsonOnly);
            
            const parsedResponse = JSON.parse(jsonOnly);
          console.log('解析后的AI响应:', parsedResponse);
          
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
          } else {
            console.error('AI响应缺少完整的分类信息:', parsedResponse);
          }
        } else {
          console.error('无法从AI响应中找到完整的JSON结构，结束位置未找到');
        }
      } else {
        console.error('无法从AI响应中找到JSON开始位置');
      }
      } catch (error) {
        console.error('解析AI响应中的分类信息失败:', error, '错误位置:', error.stack);
        // 打印更多调试信息
        console.error('AI响应原始长度:', aiResponse.length);
        console.error('AI响应前1000字符:', aiResponse.substring(0, 1000));
      }
    }
    
    // 3. 如果没有获取到分类信息，抛出错误，完全依赖LLM返回的JSON
    if (!finalClassification) {
      throw new Error('无法从AI响应中提取有效的分类信息，请检查LLM返回的JSON格式是否正确');
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
    
    // 解析文件路径，提取文件名
    const filePath = result.filePath;
    const fileName = filePath.split('/').pop();
    const category = `${finalClassification.primaryCategory}/${finalClassification.secondaryCategory}`;
    
    return {
      classification: finalClassification,
      storagePath: filePath,
      noteId: newNote.id,
      path: filePath,
      filename: fileName,
      category: category
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
    
    // 尝试找到JSON对象的开始和结束，使用括号计数法处理嵌套结构
    const startIndex = jsonStr.indexOf('{');
    if (startIndex !== -1) {
      // 寻找最外层的JSON结束位置
      let braceCount = 0;
      let endIndex = -1;
      for (let i = startIndex; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
      
      if (endIndex !== -1) {
        jsonStr = jsonStr.substring(startIndex, endIndex + 1);
      }
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







// 初始化插件
init();