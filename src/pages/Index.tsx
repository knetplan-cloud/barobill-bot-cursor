import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/ChatInterface";
import { FAQSection } from "@/components/FAQSection";
import { SettingsPanel } from "@/components/SettingsPanel";
import { type ToneType } from "@/lib/chatbot-engine";
import { ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
const faqs = [{
  category: "세금계산서 발급",
  question: "세금계산서는 어떻게 발급하나요?",
  answer: "바로빌에 로그인 후 '세금계산서 발급' 메뉴를 선택하세요.\n공급받는자의 사업자등록번호와 상호를 입력하고, 품목과 금액을 기재한 후 '발급' 버튼을 클릭하면 국세청에 자동으로 전송됩니다."
}, {
  category: "세금계산서 발급",
  question: "세금계산서 수정발급은 언제 하나요?",
  answer: "기재사항 착오, 공급가액 변동, 계약 해제, 환입(반품) 등의 사유가 발생했을 때 수정발급을 해야 합니다.\n원본 세금계산서를 조회한 후 '수정발급' 버튼을 클릭하여 수정 사유를 선택하고 수정 내용을 입력하면 됩니다."
}, {
  category: "부가가치세 신고",
  question: "부가세 신고 기한은 언제인가요?",
  answer: "부가가치세 신고는 1년에 2번(1월, 7월)입니다.\n제1기 확정신고: 7월 1일 ~ 7월 25일\n제2기 확정신고: 1월 1일 ~ 1월 25일\n간이과세자는 1월에 1번만 신고합니다."
}, {
  category: "바로빌 서비스",
  question: "바로빌 API는 어떻게 연동하나요?",
  answer: "바로빌 홈페이지에서 API 신청을 하시고, 승인 후 API 키를 발급받으실 수 있습니다.\n개발 가이드 문서를 참고하시면 REST API 또는 SOAP API 방식으로 연동 가능합니다."
}, {
  category: "세무 일반",
  question: "전자세금계산서 의무발행 대상은?",
  answer: "개인사업자: 직전연도 사업장별 공급가액 합계액이 8천만원 이상\n법인사업자: 모든 법인사업자는 의무발행 대상입니다.\nB2C 거래나 면세사업자는 제외됩니다."
}];
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
            세금계산서 발급 전문 AI 상담사
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
              <p className="font-semibold mb-2">📞 고객센터</p>
              <p className="text-muted-foreground mb-1">1544-8385</p>
              <p className="text-xs text-muted-foreground">
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