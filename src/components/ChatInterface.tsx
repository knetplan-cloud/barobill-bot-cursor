import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, ExternalLink } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { QuickQuestionButton } from "./QuickQuestionButton";
import { matchQuery, detectTone, type ToneType } from "@/lib/chatbot-engine";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  relatedGuides?: Array<{
    title: string;
    url: string;
    description: string;
    icon: string;
  }>;
  followUpQuestions?: string[];
}

interface ChatInterfaceProps {
  tone: ToneType;
}

const quickQuestions = [
  "세금계산서 어떻게 발급하나요?",
  "수정발급 방법 알려주세요",
  "부가세 신고는 언제 하나요?",
  "바로빌 API 연동 방법",
];

export const ChatInterface = ({ tone }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        tone === "formal"
          ? "안녕하세요! 😊 바로빌 AI 빌리입니다.\n세금계산서 발급 및 세무 관련 궁금하신 사항을 편하게 질문해주세요!"
          : "안녕! 😊 바로빌 AI 빌리야.\n세금계산서나 세무 관련해서 궁금한 거 있으면 편하게 물어봐!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate typing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Try to match query
    const detectedTone = detectTone(userMessage);
    const finalTone = tone; // Use user's selected tone preference
    const result = matchQuery(userMessage, finalTone);

    // Always show response if available (from matched content or fallback)
    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: result.response || (
        finalTone === "formal"
          ? "죄송합니다! 😢 해당 질문에 대한 정보를 찾지 못했습니다.\n좀 더 구체적으로 질문해주시거나, 바로빌 고객센터(1544-8385)로 문의해주시기 바랍니다."
          : "미안! 😅 그 질문은 아직 잘 모르겠어.\n좀 더 자세히 물어봐주거나, 바로빌 고객센터(1544-8385)로 연락해봐!"
      ),
      timestamp: new Date(),
      relatedGuides: result.relatedGuides,
      followUpQuestions: result.followUpQuestions,
    };
    
    setMessages((prev) => [...prev, assistantMsg]);
    setIsTyping(false);
  };

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question);
  };

  return (
    <Card className="flex flex-col h-[600px] bg-card border-border shadow-lg">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-gradient-to-r from-primary to-primary-dark text-primary-foreground rounded-t-lg">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl">
          🤖
        </div>
        <div>
          <h3 className="font-bold">바로빌 AI</h3>
          <p className="text-xs opacity-90">세금계산서 발급 전문 상담</p>
        </div>
        <Sparkles className="ml-auto w-5 h-5" />
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.map((message) => (
          <div key={message.id}>
            <ChatMessage
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
            />
            
            {/* Related Guides */}
            {message.relatedGuides && message.relatedGuides.length > 0 && (
              <div className="ml-14 mb-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  📚 관련 가이드
                </p>
                <div className="flex flex-wrap gap-2">
                  {message.relatedGuides.map((guide, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-2"
                      onClick={() => window.open(guide.url, "_blank")}
                    >
                      <span className="mr-1">{guide.icon}</span>
                      {guide.title}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Follow-up Questions */}
            {message.followUpQuestions && message.followUpQuestions.length > 0 && (
              <div className="ml-14 mb-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  💡 이런 것도 궁금하신가요?
                </p>
                <div className="flex flex-wrap gap-2">
                  {message.followUpQuestions.map((question, idx) => (
                    <QuickQuestionButton
                      key={idx}
                      question={question}
                      onClick={handleQuickQuestion}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <ChatMessage
            role="assistant"
            content=""
            timestamp={new Date()}
            isTyping
          />
        )}
        <div ref={scrollRef} />
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Quick Questions - Always visible */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            ⚡ 빠른 질문
          </p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, index) => (
              <QuickQuestionButton
                key={index}
                question={question}
                onClick={handleQuickQuestion}
              />
            ))}
          </div>
        </div>
        
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1"
            disabled={isTyping}
          />
          <Button type="submit" size="icon" disabled={isTyping || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
};
