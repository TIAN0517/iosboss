'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const GAS_RESPONSES: Record<string, string> = {
  '瓦斯': '我們提供各種瓦斯桶：4kg(NT\$250)、10kg(NT\$450)、16kg(NT\$630)、20kg(NT\$740)、50kg(NT\$1850)。歡迎訂購！',
  '價格': '瓦斯價格：4kg(NT\$250)、10kg(NT\$450)、16kg(NT\$630)、20kg(NT\$740)、50kg(NT\$1850)。美崙站：(03)822-2106 吉安站：(03)853-3999',
  '規格': '瓦斯規格：4kg、10kg、16kg、20kg、50kg。請告訴我您需要哪種規格？',
  '送貨': '我們提供花蓮地區免費送貨服務，請提供您的地址和聯繫電話。',
  '聯絡': '📍 美崙站：花蓮市中美路二街79號 (03)822-2106\n📍 吉安站：花蓮縣吉安鄉南昌路25號 (03)853-3999',
  '營業': '營業時間：週一至週日 08:00-20:00',
  'hello': '您好！我是九九瓦斯行智能助理 🔥\n\n我可以幫您：\n• 查詢瓦斯價格\n• 了解商品資訊\n• 預約送瓦斯\n• 聯繫我們\n\n請問有什麼可以幫您？',
  'hi': '您好！我是九九瓦斯行智能助理 🔥\n\n我可以幫您：\n• 查詢瓦斯價格\n• 了解商品資訊\n• 預約送瓦斯\n• 聯繫我們\n\n請問有什麼可以幫您？',
  '你好': '您好！我是九九瓦斯行智能助理 🔥\n\n我可以幫您：\n• 查詢瓦斯價格\n• 了解商品資訊\n• 預約送瓦斯\n• 聯繫我們\n\n請問有什麼可以幫您？',
  '訂購': '請告訴我您需要的瓦斯規格（4kg/10kg/16kg/20kg/50kg）和送貨地址，我們會盡快與您聯繫！',
  '庫存': '我們的瓦斯桶庫存充足，歡迎隨時訂購！',
  '預約': '請提供您希望送瓦斯的時間和地址，我們會為您安排！',
  '問題': '如有其他問題，請直接問我，或致電 (03)822-2106 詢問。',
  '幫助': '我可以幫您：查詢瓦斯價格、了解庫存、預約送瓦斯、聯繫我們等。請問需要什麼幫助？',
};

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '您好！我是九九瓦斯行智能助理 🔥\n\n我可以幫您：\n• 查詢瓦斯價格\n• 了解商品資訊\n• 預約送瓦斯\n• 聯繫我們\n\n請問有什麼可以幫您？',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const getResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();

    for (const [key, response] of Object.entries(GAS_RESPONSES)) {
      if (lowerInput.includes(key.toLowerCase())) {
        return response;
      }
    }

    return `感謝您的詢問！\n\n您可以：\n• 輸入「瓦斯」、「價格」查詢\n• 輸入「訂購」預約\n• 輸入「聯絡」聯繫我們\n\n或致電 (03)822-2106 獲得更多幫助。`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const response = getResponse(input);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/30 animate-bounce-slow"
            size="icon"
          >
            <Bot className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full text-xs text-white flex items-center justify-center">
              AI
            </span>
          </Button>
        )}
      </div>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] z-50 shadow-2xl shadow-orange-500/20 border-orange-200">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6" />
                <CardTitle className="text-lg">九九瓦斯智能助理</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-xs text-orange-100">AI 客服 | 24小時服務</p>
          </CardHeader>

          <CardContent className="p-0 h-[calc(100%-80px)] flex flex-col">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-orange-500 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-orange-200' : 'text-gray-400'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString('zh-TW', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="輸入訊息..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="bg-orange-500 hover:bg-orange-600"
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
