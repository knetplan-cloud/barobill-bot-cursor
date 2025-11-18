import { Button } from "@/components/ui/button";

interface QuickQuestionButtonProps {
  question: string;
  onClick: (question: string) => void;
}

export const QuickQuestionButton = ({ question, onClick }: QuickQuestionButtonProps) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onClick(question)}
      className="text-sm bg-card hover:bg-primary hover:text-primary-foreground border-border transition-all duration-200"
    >
      {question}
    </Button>
  );
};
