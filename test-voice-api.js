/**
 * 语音聊天 API 测试脚本
 * 用法：node test-voice-api.js <audio_file_path>
 */

const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:9999/api/voice/chat';

async function testVoiceChat(audioFilePath) {
  if (!audioFilePath) {
    console.log('用法: node test-voice-api.js <audio_file_path>');
    console.log('示例: node test-voice-api.js ./test-audio.webm');
    console.log('\n提示: 你可以用手机录制一段语音，保存为 webm 格式');
    return;
  }

  if (!fs.existsSync(audioFilePath)) {
    console.error('文件不存在:', audioFilePath);
    return;
  }

  console.log('📤 正在上传音频文件:', audioFilePath);

  try {
    const formData = new FormData();
    const audioBlob = new Blob([fs.readFileSync(audioFilePath)], {
      type: 'audio/webm',
    });

    formData.append('audio', audioBlob, 'test.webm');
    formData.append('conversationHistory', '[]');

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error('❌ API 错误:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('错误详情:', errorText);
      return;
    }

    const data = await response.json();

    console.log('\n✅ 成功！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎤 你说的:', data.transcript);
    console.log('🤖 AI 回复:', data.response);
    console.log('🔊 TTS 提供:', data.ttsProvider);
    console.log('📦 音频大小:', data.audio ? `${(data.audio.data.length * 0.75 / 1024).toFixed(1)} KB` : '无');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (data.audio) {
      console.log('\n💾 音频已生成 (base64 格式)');
      console.log('提示: 前端会自动播放此音频');
    }

  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

// 检查服务状态
async function checkStatus() {
  console.log('🔍 检查语音服务状态...\n');
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    console.log('服务状态:', data.status);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Deepgram ASR:', data.services.deepgram ? '✅ 已配置' : '❌ 未配置');
    console.log('🔊 ElevenLabs TTS:', data.services.elevenlabs ? '✅ 已配置' : '❌ 未配置');
    console.log('🎙️ Azure TTS:', data.services.azure ? '✅ 已配置' : '❌ 未配置');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('消息:', data.message);

    if (!data.services.deepgram) {
      console.log('\n⚠️ 警告: Deepgram ASR 未配置，语音识别将失败');
    }
    if (!data.services.elevenlabs && !data.services.azure) {
      console.log('\n⚠️ 警告: 没有 TTS 服务，将只返回文字不返回音频');
    }
  } catch (error) {
    console.error('❌ 无法连接到服务器:', error.message);
    console.log('提示: 请确保 Docker 服务正在运行');
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await checkStatus();
  } else {
    await testVoiceChat(args[0]);
  }
}

main();
