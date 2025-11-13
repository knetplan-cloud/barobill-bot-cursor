import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/ChatInterface";
import { FAQSection } from "@/components/FAQSection";
import { SettingsPanel } from "@/components/SettingsPanel";
import { type ToneType } from "@/lib/chatbot-engine";
import { ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import knowledgeBase from "@/data/barobill-knowledge-base.json";

const faqs = knowledgeBase.faqs || [];
const Index = () => {
  const [tone, setTone] = useState<ToneType>("formal");
  const handleExportChat = () => {
    toast.success("대화 내용을 PDF로 저장 중입니다...");
    // TODO: Implement PDF export functionality
  };
  return <div className="min-h-screen gradient-bg p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 text-center mb-8 shadow-[var(--shadow-strong)]">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-primary to-primary-dark rounded-3xl flex items-center justify-center text-5xl shadow-[var(--shadow-soft)]">
            🤖
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">바로빌 AI 빌리</h1>
          <p className="text-lg text-muted-foreground mb-4">
            세금 고민, 이제 빌리와 함께 해결하세요!
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>24시간 실시간 상담 | 정확한 세무 정보</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
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
              <Button variant="outline" className="w-full" size="lg" onClick={() => window.open("https://www.barobill.co.kr/api", "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                바로빌 API 연동하기
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