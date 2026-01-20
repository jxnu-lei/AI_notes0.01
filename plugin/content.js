// AI笔记插件内容脚本

// 全局变量
let captureToolbar = null;
let selectedText = '';

// 初始化函数
function init() {
  // 监听选中文本事件
  document.addEventListener('mouseup', handleSelection);
  
  // 监听键盘快捷键
  document.addEventListener('keydown', handleKeyboardShortcut);
  
  // 监听消息
  chrome.runtime.onMessage.addListener(handleMessage);
}

// 处理选中文本事件
function handleSelection() {
  const selection = window.getSelection();
  selectedText = selection.toString().trim();
  
  // 隐藏工具栏（不再显示工具栏）
  hideCaptureToolbar();
}

// 显示采集工具栏
function showCaptureToolbar(selection) {
  // 隐藏已存在的工具栏
  hideCaptureToolbar();
  
  // 创建工具栏
  captureToolbar = document.createElement('div');
  captureToolbar.className = 'ai-note-capture-toolbar';
  
  // 创建采集按钮
  const captureBtn = document.createElement('button');
  captureBtn.className = 'ai-note-capture-btn primary';
  captureBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> 采集到笔记';
  captureBtn.addEventListener('click', () => captureSelection());
  
  // 添加按钮到工具栏
  captureToolbar.appendChild(captureBtn);
  
  // 计算工具栏位置，确保显示在选中文本的正下方
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // 确保工具栏在视口内
  const viewportWidth = window.innerWidth;
  const toolbarWidth = 120; // 按钮的大致宽度
  
  let left = rect.left + window.scrollX;
  // 如果工具栏会超出视口右侧，调整位置
  if (left + toolbarWidth > window.scrollX + viewportWidth) {
    left = window.scrollX + viewportWidth - toolbarWidth - 10;
  }
  
  captureToolbar.style.top = `${rect.bottom + window.scrollY + 5}px`; // 距离选中文本下方5px
  captureToolbar.style.left = `${left}px`;
  
  // 添加到页面
  document.body.appendChild(captureToolbar);
  
  // 监听点击事件，点击工具栏外部时隐藏
  setTimeout(() => {
    document.addEventListener('click', hideToolbarOnClickOutside);
  }, 100);
}

// 采集选中文本
function captureSelection() {
  if (selectedText) {
    // 发送消息给后台脚本
    chrome.runtime.sendMessage({
      action: 'captureText',
      data: {
        text: selectedText,
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString()
      }
    })
    .then((response) => {
      if (response && response.success) {
        showNotification('成功', '文本已采集到笔记', 'success');
      } else {
        showNotification('错误', '采集失败，请重试', 'error');
      }
    })
    .catch((error) => {
      console.error('发送消息失败:', error);
      showNotification('错误', '采集失败，请重试', 'error');
    });
    
    hideCaptureToolbar();
  }
}

// 检查选中文本是否足够长，决定是否显示工具栏
function shouldShowToolbar(text) {
  // 只在选中文本长度大于5时显示工具栏，避免显示太短的文本
  return text && text.trim().length > 5;
}

// 隐藏采集工具栏
function hideCaptureToolbar() {
  if (captureToolbar) {
    captureToolbar.remove();
    captureToolbar = null;
    document.removeEventListener('click', hideToolbarOnClickOutside);
  }
}

// 点击工具栏外部时隐藏
function hideToolbarOnClickOutside(e) {
  if (captureToolbar && !captureToolbar.contains(e.target)) {
    hideCaptureToolbar();
  }
}

// 复制选中文本
function copySelection() {
  if (selectedText) {
    navigator.clipboard.writeText(selectedText).then(() => {
      showNotification('成功', '文本已复制到剪贴板', 'success');
    }).catch(() => {
      showNotification('错误', '复制失败，请重试', 'error');
    });
    
    hideCaptureToolbar();
  }
}

// 高亮选中文本
function highlightSelection() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'ai-note-selection-highlight';
    span.textContent = selectedText;
    range.deleteContents();
    range.insertNode(span);
    
    showNotification('成功', '文本已高亮', 'success');
    hideCaptureToolbar();
  }
}

// 处理键盘快捷键
function handleKeyboardShortcut(e) {
  // Ctrl+Shift+C 采集选中文本
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    if (selectedText) {
      captureSelection();
    }
  }
}

// 处理消息
function handleMessage(message, sender, sendResponse) {
  switch (message.action) {
    case 'captureSelection':
      if (selectedText) {
        captureSelection();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: '没有选中文本' });
      }
      break;
    case 'showNotification':
      showNotification(message.title, message.message, message.type);
      sendResponse({ success: true });
      break;
    case 'toolbarCapture':
      // 获取选中文本（使用不同的变量名避免遮蔽）
      const currentSelection = window.getSelection();
      const currentText = currentSelection.toString().trim();
      
      if (currentText) {
        // ✅ 更新全局变量
        selectedText = currentText;
        // 调用采集功能
        captureSelection();
      } else {
        // 没有选中文本，通知 background 打开侧边栏
        chrome.runtime.sendMessage({ action: 'openSidePanel' });
      }
      
      sendResponse({ success: true });
      break;
    default:
      sendResponse({ success: false, error: '未知操作' });
  }
  return true;
}

// 显示通知
function showNotification(title, message, type = 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `ai-note-notification ${type}`;
  
  const titleElement = document.createElement('div');
  titleElement.className = 'ai-note-notification-title';
  titleElement.textContent = title;
  
  const messageElement = document.createElement('div');
  messageElement.className = 'ai-note-notification-message';
  messageElement.textContent = message;
  
  notification.appendChild(titleElement);
  notification.appendChild(messageElement);
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 3秒后自动移除
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// 初始化插件
init();

// 导出函数（供其他脚本调用）
window.AINotePlugin = {
  captureSelection,
  copySelection,
  highlightSelection,
  showNotification
};
