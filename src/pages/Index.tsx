import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/ChatInterface";
import { FAQSection } from "@/components/FAQSection";
import { SettingsPanel } from "@/components/SettingsPanel";
import { type ToneType } from "@/lib/chatbot-engine";
import { ExternalLink, Sparkles, Settings } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import unifiedData from "@/data/unified-knowledge.json";

// Convert items to FAQ format
const faqs = unifiedData.items
  .filter(item => item.type === "knowledge" || item.type === "case")
  .map(item => ({
    question: item.title,
    answer: item.responses.formal,
    category: item.category
  }));
const Index = () => {
  const navigate = useNavigate();
  const [tone, setTone] = useState<ToneType>("formal");
  const handleExportChat = () => {
    toast.success("대화 내용을 PDF로 저장 중입니다...");
    // TODO: Implement PDF export functionality
  };
  return <div className="min-h-screen gradient-bg p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 text-center mb-6 shadow-[var(--shadow-strong)]">
          <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-primary to-primary-dark rounded-3xl flex items-center justify-center text-4xl shadow-[var(--shadow-soft)]">
            🤖
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">바로빌 AI 빌리</h1>
          <p className="text-base text-muted-foreground mb-3">
            세금 고민, 이제 빌리와 함께 해결하세요!
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>24시간 실시간 상담 | 정확한 세무 정보</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-[3fr_1fr] gap-6">
          <div>
            <Tabs defaultValue="chat" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="chat">AI 챗봇</TabsTrigger>
                <TabsTrigger value="faq">자주 묻는 질문</TabsTrigger>
              </TabsList>
              
              <TabsContent value="chat">
                <ChatInterface tone={tone} />
              </TabsContent>
              
              <TabsContent value="faq" className="bg-white/95 backdrop-blur-sm rounded-2xl p-6">
                <FAQSection faqs={faqs} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <SettingsPanel tone={tone} onToneChange={setTone} onExportChat={handleExportChat} />

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Button className="w-full bg-gradient-to-r from-primary to-primary-dark hover:shadow-[var(--shadow-soft)] transition-all duration-300" size="lg" onClick={() => window.open("https://www.barobill.co.kr", "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                바로빌 바로가기
              </Button>
              <Button variant="outline" className="w-full" size="lg" onClick={() => window.open("https://dev.barobill.co.kr", "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                바로빌 API 연동하기
              </Button>
              <Button variant="secondary" className="w-full" size="lg" onClick={() => navigate("/admin")}>
                <Settings className="w-4 h-4 mr-2" />
                지식베이스 관리
              </Button>
            </div>

            {/* Info Card */}
            <div className="bg-muted/50 backdrop-blur-sm rounded-2xl p-4 text-sm">
              <p className="font-semibold mb-2">📞 바로빌 고객센터</p>
              <p className="mb-1 text-slate-700">1544-8385</p>
              <p className="text-xs text-slate-700">
                평일 09:00 - 18:00
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-white/80">
          <p>© 2025 바로빌. Powered by Barobill AI</p>
        </div>
      </div>
    </div>;
};
export default Index;