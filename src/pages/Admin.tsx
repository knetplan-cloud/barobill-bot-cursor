import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Plus, Pencil, Trash2, Eye, Home } from "lucide-react";
import unifiedData from "@/data/unified-knowledge.json";
import { useNavigate } from "react-router-dom";

type KnowledgeItem = {
  id: string;
  type: string;
  category: string;
  title: string;
  description?: string;
  keywords: string[];
  priority: number;
  responses: {
    formal: string;
    casual: string;
    plain: string;
  };
  relatedGuides?: Array<{
    title: string;
    url: string;
    icon?: string;
  }>;
};

const Admin = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<KnowledgeItem[]>(unifiedData.items as KnowledgeItem[]);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // 새 항목 초기값
  const createNewItem = (): KnowledgeItem => ({
    id: `custom_${Date.now()}`,
    type: "knowledge",
    category: "세금계산서",
    title: "",
    keywords: [],
    priority: 5,
    responses: {
      formal: "",
      casual: "",
      plain: ""
    }
  });

  // 항목 추가/수정
  const handleSaveItem = (item: KnowledgeItem) => {
    if (!item.title || !item.responses.formal) {
      toast.error("제목과 formal 답변은 필수입니다!");
      return;
    }

    const existingIndex = items.findIndex(i => i.id === item.id);
    let newItems;
    
    if (existingIndex >= 0) {
      newItems = [...items];
      newItems[existingIndex] = item;
      toast.success("항목이 수정되었습니다!");
    } else {
      newItems = [...items, item];
      toast.success("새 항목이 추가되었습니다!");
    }
    
    setItems(newItems);
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  // 항목 삭제
  const handleDeleteItem = (id: string) => {
    if (confirm("정말 이 항목을 삭제하시겠습니까?")) {
      setItems(items.filter(item => item.id !== id));
      toast.success("항목이 삭제되었습니다!");
    }
  };

  // JSON 다운로드
  const handleDownload = () => {
    const data = {
      ...unifiedData,
      items: items
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `unified-knowledge-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("JSON 파일이 다운로드되었습니다!");
  };

  // 필터링된 항목
  const filteredItems = items.filter(item => {
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen gradient-bg p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">지식베이스 관리자</h1>
              <p className="text-muted-foreground">
                챗봇의 질문-답변 데이터를 직접 관리하세요
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/")}>
              <Home className="w-4 h-4 mr-2" />
              홈으로
            </Button>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button onClick={handleDownload} className="bg-primary">
              <Download className="w-4 h-4 mr-2" />
              JSON 다운로드
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => setEditingItem(createNewItem())}>
                  <Plus className="w-4 h-4 mr-2" />
                  새 항목 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem?.title ? "항목 수정" : "새 항목 추가"}
                  </DialogTitle>
                </DialogHeader>
                {editingItem && (
                  <ItemEditor item={editingItem} onSave={handleSaveItem} onCancel={() => {
                    setIsDialogOpen(false);
                    setEditingItem(null);
                  }} />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label>검색</Label>
              <Input
                placeholder="제목이나 키워드로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-[200px]">
              <Label>유형 필터</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="intent">인사 (Intent)</SelectItem>
                  <SelectItem value="knowledge">일반 지식</SelectItem>
                  <SelectItem value="case">사례 (Case)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Items List */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              총 {filteredItems.length}개 항목
            </h2>
            <div className="flex gap-2">
              <Badge variant="secondary">Intent: {items.filter(i => i.type === "intent").length}</Badge>
              <Badge variant="secondary">Knowledge: {items.filter(i => i.type === "knowledge").length}</Badge>
              <Badge variant="secondary">Case: {items.filter(i => i.type === "case").length}</Badge>
            </div>
          </div>

          <div className="space-y-3">
            {filteredItems.map((item) => (
              <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={item.type === "intent" ? "default" : item.type === "case" ? "destructive" : "secondary"}>
                        {item.type}
                      </Badge>
                      <Badge variant="outline">{item.category}</Badge>
                      <span className="text-xs text-muted-foreground">우선순위: {item.priority}</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.keywords.slice(0, 5).map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {item.keywords.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.keywords.length - 5}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.responses.formal}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingItem(item);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              검색 결과가 없습니다.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// 항목 편집 컴포넌트
const ItemEditor = ({ item, onSave, onCancel }: {
  item: KnowledgeItem;
  onSave: (item: KnowledgeItem) => void;
  onCancel: () => void;
}) => {
  const [editedItem, setEditedItem] = useState<KnowledgeItem>(item);
  const [newKeyword, setNewKeyword] = useState("");

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !editedItem.keywords.includes(newKeyword.trim())) {
      setEditedItem({
        ...editedItem,
        keywords: [...editedItem.keywords, newKeyword.trim()]
      });
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setEditedItem({
      ...editedItem,
      keywords: editedItem.keywords.filter(k => k !== keyword)
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>유형 *</Label>
          <Select value={editedItem.type} onValueChange={(value) => setEditedItem({ ...editedItem, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="intent">Intent (인사)</SelectItem>
              <SelectItem value="knowledge">Knowledge (일반)</SelectItem>
              <SelectItem value="case">Case (사례)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>카테고리 *</Label>
          <Input
            value={editedItem.category}
            onChange={(e) => setEditedItem({ ...editedItem, category: e.target.value })}
            placeholder="예: 세금계산서"
          />
        </div>
      </div>

      <div>
        <Label>제목 *</Label>
        <Input
          value={editedItem.title}
          onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
          placeholder="예: 세금계산서 발급 방법"
        />
      </div>

      <div>
        <Label>설명 (선택)</Label>
        <Textarea
          value={editedItem.description || ""}
          onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
          placeholder="이 항목에 대한 간단한 설명"
          rows={2}
        />
      </div>

      <div>
        <Label>우선순위 (1-10)</Label>
        <Input
          type="number"
          min="1"
          max="10"
          value={editedItem.priority}
          onChange={(e) => setEditedItem({ ...editedItem, priority: parseInt(e.target.value) || 5 })}
        />
      </div>

      <div>
        <Label>키워드</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddKeyword()}
            placeholder="키워드 입력 후 Enter"
          />
          <Button type="button" onClick={handleAddKeyword} size="sm">
            추가
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {editedItem.keywords.map((keyword, idx) => (
            <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveKeyword(keyword)}>
              {keyword} ×
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Formal 답변 *</Label>
        <Textarea
          value={editedItem.responses.formal}
          onChange={(e) => setEditedItem({
            ...editedItem,
            responses: { ...editedItem.responses, formal: e.target.value }
          })}
          placeholder="존댓말 답변 (필수)"
          rows={4}
        />
      </div>

      <div>
        <Label>Casual 답변</Label>
        <Textarea
          value={editedItem.responses.casual}
          onChange={(e) => setEditedItem({
            ...editedItem,
            responses: { ...editedItem.responses, casual: e.target.value }
          })}
          placeholder="반말 답변 (선택)"
          rows={4}
        />
      </div>

      <div>
        <Label>Plain 답변</Label>
        <Textarea
          value={editedItem.responses.plain}
          onChange={(e) => setEditedItem({
            ...editedItem,
            responses: { ...editedItem.responses, plain: e.target.value }
          })}
          placeholder="평어체 답변 (선택)"
          rows={4}
        />
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button onClick={() => onSave(editedItem)}>
          저장
        </Button>
      </div>
    </div>
  );
};

export default Admin;
