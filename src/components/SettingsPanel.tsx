import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { type ToneType } from "@/lib/chatbot-engine";

interface SettingsPanelProps {
  tone: ToneType;
  onToneChange: (tone: ToneType) => void;
  onExportChat: () => void;
}

export const SettingsPanel = ({ tone, onToneChange, onExportChat }: SettingsPanelProps) => {
  return (
    <Card className="p-6 space-y-6 bg-card border-border">
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

      <div className="pt-4 border-t border-border">
        <h3 className="text-lg font-semibold mb-4">대화 관리</h3>
        <Button
          variant="outline"
          className="w-full"
          onClick={onExportChat}
        >
          <Download className="w-4 h-4 mr-2" />
          대화 내용 PDF로 저장
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          현재 대화 내용을 PDF 파일로 다운로드합니다
        </p>
      </div>
    </Card>
  );
};
