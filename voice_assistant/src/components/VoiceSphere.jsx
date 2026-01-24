import React, { useEffect, useRef } from 'react';
import '../styles/VoiceSphere.css';

const VoiceSphere = ({ state, volume = 0 }) => {
    // state: 'idle' | 'listening' | 'processing' | 'speaking'
    
    return (
        <div className="voice-sphere-container">
            <div className={`sphere-wrapper ${state}`}>
                {/* 核心球體 */}
                <div className="core-sphere"></div>
                
                {/* 外部光暈/波紋 - 根據音量動態變化 */}
                <div 
                    className="wave-ring ring-1"
                    style={{ transform: `scale(${1 + volume * 0.5})` }}
                ></div>
                <div 
                    className="wave-ring ring-2"
                    style={{ transform: `scale(${1 + volume * 0.8})` }}
                ></div>
                <div 
                    className="wave-ring ring-3"
                    style={{ transform: `scale(${1 + volume * 1.2})` }}
                ></div>
                
                {/* 粒子效果 */}
                <div className="particles">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className={`particle p-${i + 1}`}></div>
                    ))}
                </div>
            </div>
            
            <div className="state-label">
                {state === 'idle' && '點擊開始對話'}
                {state === 'listening' && '正在聆聽...'}
                {state === 'processing' && '思考中...'}
                {state === 'speaking' && '豆包說話中...'}
            </div>
        </div>
    );
};

export default VoiceSphere;