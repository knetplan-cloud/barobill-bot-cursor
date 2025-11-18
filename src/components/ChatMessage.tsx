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
    description?: string;
    icon?: string;
  }>;
  followUpQuestions?: string[];
  relatedQuestions?: string[];
  onQuestionClick?: (question: string) => void;
}
export const ChatMessage = ({
  role,
  content,
  timestamp,
  isTyping,
  relatedGuides,
  followUpQuestions,
  relatedQuestions,
  onQuestionClick
}: ChatMessageProps) => {
  const isUser = role === "user";
  return <div className={cn("flex gap-3 mb-4", isUser && "flex-row-reverse")}>
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-xl", isUser ? "bg-muted" : "bg-gradient-to-br from-primary to-primary-dark shadow-md")}>
          {isUser ? "👤" : "🤖"}
        </div>
        {!isUser && <span className="text-xs font-semibold text-primary whitespace-nowrap">
            빌리 AI
          </span>}
      </div>
      
      <div className={cn("flex flex-col max-w-[75%]", isUser && "items-end")}>
        <div className={cn("rounded-2xl px-4 py-3 transition-all duration-300", isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm shadow-sm")}>
          {isTyping ? <div className="flex gap-1">
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{
            animationDelay: "0ms"
          }} />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{
            animationDelay: "150ms"
          }} />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{
            animationDelay: "300ms"
          }} />
            </div> : <>
              <div className="text-sm space-y-2">
                {content.split('\n\n').map((paragraph, idx) => {
              // Markdown bold와 대괄호로 감싸진 키워드 강조 처리 함수
              const highlightKeywords = (text: string) => {
                // Markdown bold (**텍스트**)와 대괄호([텍스트])를 모두 처리
                // 정규식으로 분리: **텍스트**, [텍스트], 일반 텍스트
                const parts: Array<{type: 'bold' | 'bracket' | 'text', content: string}> = [];
                
                // 모든 매칭 패턴 찾기
                const patterns = [
                  { regex: /\*\*(.+?)\*\*/g, type: 'bold' as const },
                  { regex: /(\[.*?\])/g, type: 'bracket' as const }
                ];
                
                const matches: Array<{index: number, type: 'bold' | 'bracket', content: string, fullMatch: string}> = [];
                
                patterns.forEach(({ regex, type }) => {
                  let match;
                  regex.lastIndex = 0; // Reset regex
                  while ((match = regex.exec(text)) !== null) {
                    matches.push({
                      index: match.index,
                      type,
                      content: type === 'bold' ? match[1] : match[0],
                      fullMatch: match[0]
                    });
                  }
                });
                
                // 인덱스 순으로 정렬
                matches.sort((a, b) => a.index - b.index);
                
                // 겹치지 않도록 처리
                let currentIndex = 0;
                matches.forEach((match) => {
                  // 이전 매칭과 겹치면 스킵
                  if (match.index < currentIndex) return;
                  
                  // 매칭 전 텍스트 추가
                  if (match.index > currentIndex) {
                    parts.push({
                      type: 'text',
                      content: text.substring(currentIndex, match.index)
                    });
                  }
                  
                  // 매칭된 부분 추가
                  parts.push({
                    type: match.type,
                    content: match.content
                  });
                  
                  currentIndex = match.index + match.fullMatch.length;
                });
                
                // 남은 텍스트 추가
                if (currentIndex < text.length) {
                  parts.push({
                    type: 'text',
                    content: text.substring(currentIndex)
                  });
                }
                
                // React 요소로 변환
                return parts.map((part, partIdx) => {
                  if (part.type === 'bold') {
                    return <strong key={partIdx} className="font-bold">
                            {part.content}
                          </strong>;
                  } else if (part.type === 'bracket') {
                    return <span key={partIdx} className="font-semibold text-blue-700 dark:text-blue-400">
                            {part.content}
                          </span>;
                  } else {
                    return <span key={partIdx}>{part.content}</span>;
                  }
                });
              };

              // 넘버링 리스트 감지 (1. 2. 3. 등으로 시작)
              const hasNumbering = /^\d+\./.test(paragraph.trim());
              
              if (hasNumbering) {
                // 넘버링 리스트는 각 항목에 작은 간격
                return <div key={idx} className="space-y-1">
                        {paragraph.split('\n').map((line, lineIdx) => 
                          <p key={lineIdx} className="font-medium leading-relaxed whitespace-pre-wrap">
                            {highlightKeywords(line)}
                          </p>
                        )}
                      </div>;
              } else {
                // 일반 단락은 whitespace-pre-wrap으로 원본 줄바꿈 유지
                return <p key={idx} className="leading-relaxed whitespace-pre-wrap">
                        {highlightKeywords(paragraph)}
                      </p>;
              }
            })}
              </div>
              
              {/* Related Guides - Inside message bubble */}
              {relatedGuides && relatedGuides.length > 0 && <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    📚 관련 가이드
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {relatedGuides.slice(0, 2).map((guide, idx) => <Button key={idx} variant="outline" size="sm" className="text-xs h-auto py-2" onClick={() => window.open(guide.url, "_blank")}>
                        {guide.icon && <span className="mr-1">{guide.icon}</span>}
                        {guide.title}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>)}
                  </div>
                </div>}
              
              {/* Follow-up Questions - Inside message bubble */}
              {followUpQuestions && followUpQuestions.length > 0 && onQuestionClick && <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    💡 이런 것도 궁금하신가요?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {followUpQuestions.slice(0, 2).map((question, idx) => <QuickQuestionButton key={idx} question={question} onClick={onQuestionClick} />)}
                  </div>
                </div>}
              
              {/* Related Questions - Inside message bubble */}
              {relatedQuestions && relatedQuestions.length > 0 && onQuestionClick && <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    🔗 관련 질문
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {relatedQuestions.slice(0, 3).map((question, idx) => <QuickQuestionButton key={idx} question={question} onClick={onQuestionClick} />)}
                  </div>
                </div>}
            </>}
        </div>
        <span className="text-xs text-muted-foreground mt-1 px-1">
          {timestamp.toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit"
        })}
        </span>
      </div>
    </div>;
};