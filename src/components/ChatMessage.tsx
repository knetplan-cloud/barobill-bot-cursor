import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { QuickQuestionButton } from "./QuickQuestionButton";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  relatedGuides?: Array<{
    title: string;
    url: string;
    description: string;
    icon: string;
  }>;
  followUpQuestions?: string[];
  onQuestionClick?: (question: string) => void;
}

export const ChatMessage = ({ role, content, timestamp, isTyping, relatedGuides, followUpQuestions, onQuestionClick }: ChatMessageProps) => {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3 mb-4", isUser && "flex-row-reverse")}>
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-xl",
            isUser
              ? "bg-muted"
              : "bg-gradient-to-br from-primary to-primary-dark shadow-md"
          )}
        >
          {isUser ? "👤" : "🤖"}
        </div>
        {!isUser && (
          <span className="text-[10px] font-semibold text-primary whitespace-nowrap">
            빌리 AI
          </span>
        )}
      </div>
      
      <div className={cn("flex flex-col max-w-[75%]", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 transition-all duration-300",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card border border-border rounded-tl-sm shadow-sm"
          )}
        >
          {isTyping ? (
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : (
            <>
              <div className="text-sm leading-relaxed space-y-2">
                {content.split('\n\n').map((paragraph, idx) => {
                  // 넘버링 리스트 감지 (1. 2. 3. 등으로 시작)
                  const hasNumbering = /^\d+\./.test(paragraph.trim());
                  
                  if (hasNumbering) {
                    // 넘버링 리스트는 각 항목에 작은 간격
                    return (
                      <div key={idx} className="space-y-1">
                        {paragraph.split('\n').map((line, lineIdx) => (
                          <p key={lineIdx}>{line}</p>
                        ))}
                      </div>
                    );
                  } else {
                    // 일반 텍스트는 마침표 기준으로 문장 분리
                    const sentences = paragraph.split(/(?<=\.)\s+/).filter(s => s.trim());
                    return (
                      <div key={idx} className="space-y-1">
                        {sentences.map((sentence, sIdx) => (
                          <p key={sIdx} className="leading-relaxed">{sentence}</p>
                        ))}
                      </div>
                    );
                  }
                })}
              </div>
              
              {/* Related Guides - Inside message bubble */}
              {relatedGuides && relatedGuides.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    📚 관련 가이드
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {relatedGuides.slice(0, 2).map((guide, idx) => (
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
              
              {/* Follow-up Questions - Inside message bubble */}
              {followUpQuestions && followUpQuestions.length > 0 && onQuestionClick && (
                <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    💡 이런 것도 궁금하신가요?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {followUpQuestions.slice(0, 2).map((question, idx) => (
                      <QuickQuestionButton
                        key={idx}
                        question={question}
                        onClick={onQuestionClick}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <span className="text-xs text-muted-foreground mt-1 px-1">
          {timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
};
