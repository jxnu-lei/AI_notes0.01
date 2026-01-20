// offscreen.js - 处理文件系统操作

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

// 清理文件/目录名中的非法字符，保留中文
function cleanFileName(name) {
  // 1. 去除首尾空格
  let cleanName = name.trim();
  
  // 2. 如果为空，使用默认名称
  if (!cleanName) {
    return '未命名';
  }
  
  // 3. 替换所有文件系统不允许的字符，包括控制字符
  // 替换 Windows 不允许的字符: \/:*?"<>|
  // 替换 Unix 不允许的字符: /
  // 替换控制字符: \x00-\x1F\x7F
  cleanName = cleanName.replace(/[\\/:*?"<>|\x00-\x1F\x7F]/g, '_');
  
  // 4. 替换连续的下划线为单个下划线
  cleanName = cleanName.replace(/_+/g, '_');
  
  // 5. 去除首尾下划线
  cleanName = cleanName.replace(/^_+|_+$/g, '');
  
  // 6. 确保文件名不为空（防止所有字符都被替换的情况）
  if (!cleanName) {
    return '未命名';
  }
  
  // 7. 限制文件名长度（不同文件系统有不同限制，这里取一个安全值）
  const maxLength = 255;
  if (cleanName.length > maxLength) {
    cleanName = cleanName.slice(0, maxLength);
  }
  
  return cleanName;
}

// 确保目录存在
async function ensureDirectory(parentHandle, dirName) {
  const cleanName = cleanFileName(dirName);
  console.log('创建目录:', dirName, '-> 清理后:', cleanName);
  return await parentHandle.getDirectoryHandle(cleanName, { create: true });
}

// 写入文件（使用 TextEncoder 确保 UTF-8 编码）
async function writeFile(directoryHandle, fileName, content) {
  const cleanName = cleanFileName(fileName);
  console.log('写入文件:', fileName, '-> 清理后:', cleanName);
  
  const fileHandle = await directoryHandle.getFileHandle(cleanName, { create: true });
  const writable = await fileHandle.createWritable();
  
  // 使用 TextEncoder 明确指定 UTF-8 编码
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(content);
  
  // 写入 UTF-8 编码的字节数组
  await writable.write(uint8Array);
  await writable.close();
  
  console.log('文件写入成功:', cleanName, '内容长度:', uint8Array.length);
  return true;
}

// 读取文件（使用 TextDecoder 确保 UTF-8 解码）
async function readFile(directoryHandle, fileName) {
  try {
    const cleanName = cleanFileName(fileName);
    const fileHandle = await directoryHandle.getFileHandle(cleanName);
    const file = await fileHandle.getFile();
    
    // 使用 arrayBuffer 然后用 TextDecoder 解码，确保 UTF-8
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(arrayBuffer);
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return null;
    }
    throw error;
  }
}

// 检查文件是否存在
async function checkFileExists(directoryHandle, fileName) {
  try {
    const cleanName = cleanFileName(fileName);
    await directoryHandle.getFileHandle(cleanName);
    return true;
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return false;
    }
    throw error;
  }
}

// 追加内容到文件
async function appendToFile(directoryHandle, fileName, content) {
  const cleanName = cleanFileName(fileName);
  const fileHandle = await directoryHandle.getFileHandle(cleanName);
  
  // 读取现有内容
  const file = await fileHandle.getFile();
  const existingContent = await file.text();
  
  // 生成分隔符和时间戳
  const separator = `\n\n---\n\n## 更新于 ${new Date().toLocaleString('zh-CN')}\n\n`;
  
  // 合并内容
  const newContent = existingContent + separator + content;
  
  // 写入合并后的内容
  const writable = await fileHandle.createWritable();
  const encoder = new TextEncoder();
  await writable.write(encoder.encode(newContent));
  await writable.close();
  
  console.log('内容已追加到文件:', cleanName);
  return true;
}

// 保存笔记到文件系统
async function saveNoteToFileSystem(data) {
  const { primaryCategory, secondaryCategory, noteContent, noteType, summary, keywords } = data;
  
  console.log('开始保存笔记到文件系统');
  console.log('一级分类:', primaryCategory);
  console.log('二级分类:', secondaryCategory);
  console.log('笔记类型:', noteType);
  console.log('笔记摘要:', summary);
  console.log('笔记关键词:', keywords);
  
  // 获取根目录句柄
  const rootHandle = await getDirectoryHandle();
  if (!rootHandle) {
    throw new Error('未设置存储目录，请先在设置中选择存储目录');
  }
  
  // 验证权限
  const permission = await rootHandle.queryPermission({ mode: 'readwrite' });
  if (permission !== 'granted') {
    const requestResult = await rootHandle.requestPermission({ mode: 'readwrite' });
    if (requestResult !== 'granted') {
      throw new Error('没有写入权限，请重新授权存储目录');
    }
  }
  
  // 创建目录结构: AI笔记/一级分类/二级分类/
  console.log('创建目录结构...');
  const aiNotesDir = await ensureDirectory(rootHandle, 'AI笔记');
  const primaryDir = await ensureDirectory(aiNotesDir, primaryCategory);
  const secondaryDir = await ensureDirectory(primaryDir, secondaryCategory);
  
  // 使用 noteType 作为文件名，而非时间戳+标题
  const fileName = `${cleanFileName(noteType)}.md`;
  
  console.log('生成的文件名:', fileName);
  
  // 检查文件是否存在并决定写入方式
  const fileExists = await checkFileExists(secondaryDir, fileName);
  
  if (fileExists) {
    // 文件存在：追加内容
    await appendToFile(secondaryDir, fileName, noteContent);
  } else {
    // 文件不存在：创建新文件
    await writeFile(secondaryDir, fileName, noteContent);
  }
  
  // 更新二级分类索引
  await updateIndex(secondaryDir, fileName, noteType, false, secondaryCategory, summary, keywords);
  
  // 更新一级分类索引
  await updateIndex(primaryDir, secondaryCategory, secondaryCategory, true, primaryCategory, summary, keywords);
  
  const filePath = `AI笔记/${primaryCategory}/${secondaryCategory}/${fileName}`;
  console.log('笔记保存完成:', filePath);
  
  return {
    success: true,
    filePath: filePath
  };
}

// 更新索引文件
async function updateIndex(directoryHandle, itemName, itemTitle, isCategory, categoryName, summary = '', keywords = []) {
  const indexFileName = '目录.md';
  
  console.log('更新索引文件:', indexFileName, '添加项目:', itemName);
  
  // 读取现有索引
  let indexContent = await readFile(directoryHandle, indexFileName);
  
  const now = new Date().toLocaleString('zh-CN');
  const cleanItemName = cleanFileName(itemName);
  
  if (!indexContent) {
    // 创建新索引（带元数据头部，便于渐进式加载）
    indexContent = `---
title: ${categoryName || '笔记'}目录
created: ${now}
updated: ${now}
count: 0
---

# ${categoryName || '笔记'}目录

## 笔记列表
`;
    console.log('创建新索引文件');
  }
  
  // 检查是否已存在该条目
  if (indexContent.includes(`[${itemTitle}]`)) {
    // 已存在：只更新元数据中的时间
    indexContent = indexContent.replace(
      /updated: .+/,
      `updated: ${now}`
    );
    console.log('项目已存在，更新时间');
  } else {
    // 不存在：追加新条目
    let newEntry;
    if (isCategory) {
      newEntry = `- 📁 [${itemTitle}](./${cleanItemName}/目录.md) - ${now}\n`;
    } else {
      // 生成摘要和关键词信息
      const summaryText = summary ? `\n  - **摘要**: ${summary}` : '';
      const keywordsText = keywords.length > 0 ? `\n  - **关键词**: ${keywords.join('、')}` : '';
      newEntry = `- 📄 [${itemTitle}](./${cleanItemName}) - ${now}${summaryText}${keywordsText}\n`;
    }
    
    // 在"## 笔记列表"后追加
    indexContent = indexContent.replace(
      '## 笔记列表\n',
      `## 笔记列表\n${newEntry}`
    );
    
    // 更新计数
    const countMatch = indexContent.match(/count: (\d+)/);
    if (countMatch) {
      const newCount = parseInt(countMatch[1]) + 1;
      indexContent = indexContent.replace(/count: \d+/, `count: ${newCount}`);
    }
    
    // 更新时间
    indexContent = indexContent.replace(/updated: .+/, `updated: ${now}`);
    console.log('添加新项目到索引');
  }
  
  // 写入索引文件
  await writeFile(directoryHandle, indexFileName, indexContent);
  console.log('索引文件更新完成');
}

// 监听来自 background.js 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;
  
  console.log('offscreen 收到消息:', message.action);
  
  switch (message.action) {
    case 'saveNote':
      saveNoteToFileSystem(message.data)
        .then(result => {
          console.log('保存成功:', result);
          sendResponse(result);
        })
        .catch(error => {
          console.error('保存失败:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // 保持消息通道开放
      
    case 'checkPermission':
      getDirectoryHandle()
        .then(async (handle) => {
          if (!handle) {
            sendResponse({ hasPermission: false, reason: 'no_directory' });
            return;
          }
          const permission = await handle.queryPermission({ mode: 'readwrite' });
          sendResponse({ hasPermission: permission === 'granted' });
        })
        .catch(error => {
          console.error('检查权限失败:', error);
          sendResponse({ hasPermission: false, error: error.message });
        });
      return true;
  }
});

console.log('offscreen.js 已加载');