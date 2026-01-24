// 豆包式語音助手主程序
import React from 'react';
import { createRoot } from 'react-dom/client';
import VoiceAssistant from './components/VoiceAssistant.jsx';

// 創建React根元素並渲染應用
const container = document.getElementById('root');
const root = createRoot(container);

// 渲染語音助手應用
root.render(
    <React.StrictMode>
        <VoiceAssistant />
    </React.StrictMode>
);

// 檢查瀏覽器兼容性
function checkBrowserCompatibility() {
    const issues = [];
    
    // 檢查Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        issues.push('語音識別API不支持');
    }
    
    // 檢查Web Audio API
    if (!('AudioContext' in window) && !('webkitAudioContext' in window)) {
        issues.push('Web Audio API不支持');
    }
    
    // 檢查MediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        issues.push('麥克風權限API不支持');
    }
    
    return issues;
}

// 初始化應用
function initializeApp() {
    const issues = checkBrowserCompatibility();
    
    if (issues.length > 0) {
        console.warn('瀏覽器兼容性問題:', issues);
        
        // 顯示兼容性警告（但允許繼續）
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #f59e0b;
            color: white;
            padding: 10px;
            text-align: center;
            z-index: 10000;
            font-family: 'Inter', sans-serif;
        `;
        warning.innerHTML = `
            ⚠️ 瀏覽器兼容性警告：${issues.join('，')} 
            <button onclick="this.parentElement.remove()" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 5px 10px;
                margin-left: 10px;
                border-radius: 4px;
                cursor: pointer;
            ">關閉</button>
        `;
        document.body.appendChild(warning);
    }
}

// 設置全局錯誤處理
window.addEventListener('error', (event) => {
    console.error('全局錯誤:', event.error);
    // 可以在這裡添加錯誤報告邏輯
});

// 設置未處理的Promise拒絕處理
window.addEventListener('unhandledrejection', (event) => {
    console.error('未處理的Promise拒絕:', event.reason);
    event.preventDefault();
});

// 初始化應用
initializeApp();

// 導出應用實例（如果需要）
export { VoiceAssistant };