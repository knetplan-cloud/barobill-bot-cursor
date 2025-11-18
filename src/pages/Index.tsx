import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/ChatInterface";
import { FAQSection } from "@/components/FAQSection";
import { SettingsPanel } from "@/components/SettingsPanel";
import { type ToneType } from "@/lib/chatbot-engine";
import { ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import unifiedData from "@/data/barobill-knowledge.json";
import faqData from "@/data/barobill-faq.json";

// Convert FAQ items to FAQ format
const faqs = faqData.items.map(item => ({
  question: item.question,
  category: item.category,
  content: item.content || undefined,
  answer: item.answer || undefined,  // 하위 호환성
  images: item.images || undefined   // 하위 호환성
}));

// FAQ ID 목록 추출 (도움됨 수 조회용)
const faqIds = faqData.items.map(item => item.id);
const Index = () => {
  const navigate = useNavigate();
  const [tone, setTone] = useState<ToneType>("formal");
  const [activeTab, setActiveTab] = useState("chat");
  
  return <div className="min-h-screen gradient-bg p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 mb-6 shadow-[var(--shadow-strong)]">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-3xl flex items-center justify-center text-4xl shadow-[var(--shadow-soft)] flex-shrink-0">
              🤖
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">바로빌 AI 빌리</h1>
          </div>
          <p className="text-base text-muted-foreground text-center">
            세금 고민, 이제 빌리와 함께 해결하세요!
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-[3fr_1fr] gap-6">
          <div>
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value);
              // 탭 전환 시 페이지 및 챗봇 스크롤 상단 유지
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="chat" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold">AI 챗봇</TabsTrigger>
                <TabsTrigger value="faq" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold">자주 묻는 질문</TabsTrigger>
              </TabsList>
              
              <TabsContent value="chat">
                <ChatInterface key={activeTab} tone={tone} />
              </TabsContent>
              
              <TabsContent value="faq" className="bg-white/95 backdrop-blur-sm rounded-2xl p-6">
                <FAQSection faqs={faqs} categories={faqData.categories} faqIds={faqIds} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <SettingsPanel tone={tone} onToneChange={setTone} />

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Button className="w-full bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-blue-950 text-white hover:shadow-[var(--shadow-soft)] transition-all duration-300" size="lg" onClick={() => window.open("https://www.barobill.co.kr", "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                바로빌 바로가기
              </Button>
              <Button variant="outline" className="w-full" size="lg" onClick={() => window.open("https://dev.barobill.co.kr", "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                바로빌 API 연동하기
              </Button>
            </div>

            {/* Info Card */}
            <div className="bg-muted/50 backdrop-blur-sm rounded-2xl p-4 text-sm">
              <p className="font-semibold mb-2">📞 바로빌 고객센터</p>
              <p className="text-slate-700 font-medium">1544-8385 (평일 09:00 - 18:00)</p>
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