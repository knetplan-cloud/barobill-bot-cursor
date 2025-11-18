import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import { type ToneType } from "@/lib/chatbot-engine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SettingsPanelProps {
  tone: ToneType;
  onToneChange: (tone: ToneType) => void;
}

export const SettingsPanel = ({ tone, onToneChange }: SettingsPanelProps) => {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      toast.error("피드백 내용을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("feedback")
        .insert({
          content: feedback.trim(),
          created_at: new Date().toISOString(),
          status: "pending"
        });

      if (error) throw error;

      toast.success("피드백이 전송되었습니다. 감사합니다! 🙏");
      setFeedback("");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("피드백 전송에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 space-y-6 bg-card border-border">
      {/* AI 어투 설정 - 유지 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">AI 어투 설정</h3>
        <RadioGroup value={tone} onValueChange={(value) => onToneChange(value as ToneType)}>
          <div className="flex items-center space-x-2 mb-3">
            <RadioGroupItem value="formal" id="formal" />
            <Label htmlFor="formal" className="cursor-pointer">
              <div className="font-medium">전문적 (격식체)</div>
              <div className="text-sm text-muted-foreground">
                공식적인 비즈니스 상황에 적합합니다
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="casual" id="casual" />
            <Label htmlFor="casual" className="cursor-pointer">
              <div className="font-medium">친근함 (평어체)</div>
              <div className="text-sm text-muted-foreground">
                편안한 대화체로 소통합니다
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* 피드백 입력 - 새로 추가 */}
      <div className="pt-4 border-t border-border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          챗봇 개선 의견
        </h3>
        <Textarea
          placeholder="챗봇 개선을 위한 의견이나 불편사항을 남겨주세요..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          className="mb-3"
        />
        <Button
          className="w-full"
          onClick={handleSubmitFeedback}
          disabled={isSubmitting || !feedback.trim()}
        >
          {isSubmitting ? "전송 중..." : "의견 제출"}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          소중한 의견이 챗봇 개선에 도움이 됩니다.
        </p>
      </div>
    </Card>
  );
};
