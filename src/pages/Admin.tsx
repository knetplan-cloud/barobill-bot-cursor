import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, Plus, Pencil, Trash2, Eye, Home, RefreshCw, MessageSquare, Calendar } from "lucide-react";
import unifiedData from "@/data/barobill-knowledge.json";
import faqData from "@/data/barobill-faq.json";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type KnowledgeItem = {
  id: string;
  type: string;
  category: string;
  title: string;
  description?: string;
  keywords: string[];
  negativeKeywords?: string[];
  priority: number;
  dateTemplate?: boolean;
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

type Feedback = {
  id: string;
  content: string;
  created_at: string;
  status: string;
};

type FAQItem = {
  id: string;
  question: string;
  category: string;
  order?: number;
  content?: Array<{
    type: "text" | "image";
    content?: string;
    src?: string;
    alt?: string;
    caption?: string;
  }>;
  answer?: string;
  images?: Array<{
    src: string;
    alt?: string;
    caption?: string;
  }>;
  relatedGuides?: Array<{
    title: string;
    url: string;
    icon?: string;
  }>;
  relatedKnowledgeId?: string;
};

type Holiday = {
  id: string;
  date: string;
  name: string;
  year: number;
  is_custom: boolean;
  created_at?: string;
  updated_at?: string;
};

const Admin = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<KnowledgeItem[]>(unifiedData.items as KnowledgeItem[]);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("knowledge");
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());
  
  // 카테고리 목록 추출 및 관리
  const getCategories = (): string[] => {
    const categories = new Set<string>();
    items.forEach(item => {
      if (item.category) categories.add(item.category);
    });
    return Array.from(categories).sort();
  };
  
  const [categories, setCategories] = useState<string[]>(getCategories());
  const [newCategory, setNewCategory] = useState("");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  // 카테고리 추가
  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      toast.error("카테고리명을 입력해주세요.");
      return;
    }
    if (categories.includes(newCategory.trim())) {
      toast.error("이미 존재하는 카테고리입니다.");
      return;
    }
    setCategories([...categories, newCategory.trim()].sort());
    setNewCategory("");
    setIsCategoryDialogOpen(false);
    toast.success("카테고리가 추가되었습니다!");
  };

  // 카테고리 목록 업데이트 (items 변경 시)
  useEffect(() => {
    setCategories(getCategories());
  }, [items]);

  // 새 항목 초기값
  const createNewItem = (): KnowledgeItem => ({
    id: `custom_${Date.now()}`,
    type: "knowledge",
    category: "세금계산서",
    title: "",
    keywords: [],
    negativeKeywords: [],
    priority: 5,
    dateTemplate: false,
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
    link.download = `barobill-knowledge-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("JSON 파일이 다운로드되었습니다!");
  };

  // 피드백 로드
  useEffect(() => {
    if (activeTab === "feedback") {
      loadFeedbacks();
    }
  }, [activeTab]);

  const loadFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error) {
      console.error("Error loading feedbacks:", error);
      toast.error("피드백을 불러오는데 실패했습니다.");
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm("정말 이 피드백을 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("feedback")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("피드백이 삭제되었습니다.");
      loadFeedbacks();
    } catch (error) {
      console.error("Error deleting feedback:", error);
      toast.error("피드백 삭제에 실패했습니다.");
    }
  };

  // 공휴일 관리 함수들
  const loadHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;
      setHolidays(data || []);
    } catch (error) {
      console.error("Error loading holidays:", error);
      toast.error("공휴일을 불러오는데 실패했습니다.");
    }
  };

  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayName.trim()) {
      toast.error("날짜와 공휴일명을 입력해주세요.");
      return;
    }

    try {
      const dateObj = new Date(newHolidayDate);
      const year = dateObj.getFullYear();

      const { error } = await supabase
        .from("holidays")
        .insert({
          date: newHolidayDate,
          name: newHolidayName.trim(),
          year: year,
          is_custom: true
        });

      if (error) throw error;
      toast.success("공휴일이 추가되었습니다.");
      setNewHolidayDate("");
      setNewHolidayName("");
      loadHolidays();
    } catch (error: any) {
      console.error("Error adding holiday:", error);
      if (error.code === "23505") {
        toast.error("이미 등록된 날짜입니다.");
      } else {
        toast.error("공휴일 추가에 실패했습니다.");
      }
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("정말 이 공휴일을 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("holidays")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("공휴일이 삭제되었습니다.");
      loadHolidays();
    } catch (error) {
      console.error("Error deleting holiday:", error);
      toast.error("공휴일 삭제에 실패했습니다.");
    }
  };

  // 공휴일 탭 활성화 시 로드
  useEffect(() => {
    if (activeTab === "holidays") {
      loadHolidays();
    }
  }, [activeTab]);

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
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingItem(createNewItem());
                    setActiveTab("knowledge");
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  지식베이스 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem?.title ? "항목 수정" : "새 지식베이스 추가"}
                  </DialogTitle>
                </DialogHeader>
                {editingItem && (
                  <ItemEditor 
                    item={editingItem} 
                    onSave={handleSaveItem} 
                    onCancel={() => {
                      setIsDialogOpen(false);
                      setEditingItem(null);
                    }}
                    categories={categories}
                    newCategory={newCategory}
                    setNewCategory={setNewCategory}
                    isCategoryDialogOpen={isCategoryDialogOpen}
                    setIsCategoryDialogOpen={setIsCategoryDialogOpen}
                    handleAddCategory={handleAddCategory}
                  />
                )}
              </DialogContent>
            </Dialog>
            <Button 
              variant="outline" 
              onClick={() => {
                setActiveTab("faq");
                // FAQ 추가 버튼 클릭 이벤트는 FAQManagementSection에서 처리
                setTimeout(() => {
                  const faqAddButton = document.querySelector('[data-faq-add-button]') as HTMLElement;
                  if (faqAddButton) {
                    faqAddButton.click();
                  }
                }, 100);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              FAQ 추가
            </Button>
          </div>
        </Card>

        {/* Tabs로 지식베이스, FAQ, 피드백, 공휴일 관리 분리 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="knowledge">지식베이스 관리</TabsTrigger>
            <TabsTrigger value="faq">FAQ 관리</TabsTrigger>
            <TabsTrigger value="feedback">
              <MessageSquare className="w-4 h-4 mr-2" />
              피드백 관리
              {feedbacks.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {feedbacks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="holidays">
              <Calendar className="w-4 h-4 mr-2" />
              공휴일 관리
            </TabsTrigger>
          </TabsList>

          <TabsContent value="knowledge">
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
                      <SelectItem value="faq">FAQ (자주묻는질문)</SelectItem>
                      <SelectItem value="error">오류 해결 (Error)</SelectItem>
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
                  <Badge variant="secondary">FAQ: {items.filter(i => i.type === "faq").length}</Badge>
                  <Badge variant="secondary">Error: {items.filter(i => i.type === "error").length}</Badge>
                </div>
              </div>

              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={
                            item.type === "intent" ? "default" : 
                            item.type === "case" || item.type === "error" ? "destructive" : 
                            item.type === "faq" ? "outline" :
                            "secondary"
                          }>
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
          </TabsContent>

          <TabsContent value="faq">
            <FAQManagementSection />
          </TabsContent>

          <TabsContent value="holidays">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">공휴일 관리</h2>
                <Button variant="outline" onClick={loadHolidays}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  새로고침
                </Button>
              </div>

              {/* 공휴일 추가 폼 */}
              <div className="mb-6 p-4 border rounded-lg bg-muted/50">
                <h3 className="text-sm font-semibold mb-3">새 공휴일 추가</h3>
                <div className="flex gap-2 flex-wrap">
                  <Input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    placeholder="날짜 선택"
                    className="w-40"
                  />
                  <Input
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    placeholder="공휴일명 (예: 임시공휴일)"
                    className="flex-1 min-w-40"
                  />
                  <Button onClick={handleAddHoliday}>
                    <Plus className="w-4 h-4 mr-2" />
                    추가
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  💡 사용자 지정 공휴일을 추가하면 날짜 계산 시 자동으로 반영됩니다.
                </p>
              </div>

              {/* 연도별 필터 */}
              <div className="mb-4">
                <Label className="mr-2">연도:</Label>
                <Select value={holidayYear.toString()} onValueChange={(v) => setHolidayYear(parseInt(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028].map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}년</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 공휴일 목록 */}
              <div className="space-y-2">
                {holidays
                  .filter(h => h.year === holidayYear)
                  .map((holiday) => (
                    <Card key={holiday.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="font-semibold">{holiday.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(holiday.date).toLocaleDateString('ko-KR', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                weekday: 'long'
                              })}
                            </div>
                          </div>
                          <Badge variant={holiday.is_custom ? "default" : "secondary"}>
                            {holiday.is_custom ? "사용자 지정" : "법정 공휴일"}
                          </Badge>
                        </div>
                        {holiday.is_custom && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteHoliday(holiday.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                {holidays.filter(h => h.year === holidayYear).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {holidayYear}년 공휴일이 없습니다.
                  </div>
                )}
              </div>

              {/* 통계 */}
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">법정 공휴일:</span>
                    <span className="ml-2 font-semibold">
                      {holidays.filter(h => h.year === holidayYear && !h.is_custom).length}개
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">사용자 지정:</span>
                    <span className="ml-2 font-semibold">
                      {holidays.filter(h => h.year === holidayYear && h.is_custom).length}개
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  사용자 피드백 ({feedbacks.length}개)
                </h2>
                <Button variant="outline" onClick={loadFeedbacks}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  새로고침
                </Button>
              </div>

              <div className="space-y-3">
                {feedbacks.map((feedback) => (
                  <Card key={feedback.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">
                            {new Date(feedback.created_at).toLocaleString("ko-KR", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </Badge>
                          <Badge variant={feedback.status === "pending" ? "default" : "secondary"}>
                            {feedback.status === "pending" ? "대기중" : feedback.status === "reviewed" ? "검토완료" : "해결완료"}
                          </Badge>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{feedback.content}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteFeedback(feedback.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {feedbacks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  아직 피드백이 없습니다.
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// 항목 편집 컴포넌트
const ItemEditor = ({ 
  item, 
  onSave, 
  onCancel,
  categories,
  newCategory,
  setNewCategory,
  isCategoryDialogOpen,
  setIsCategoryDialogOpen,
  handleAddCategory
}: {
  item: KnowledgeItem;
  onSave: (item: KnowledgeItem) => void;
  onCancel: () => void;
  categories: string[];
  newCategory: string;
  setNewCategory: (value: string) => void;
  isCategoryDialogOpen: boolean;
  setIsCategoryDialogOpen: (value: boolean) => void;
  handleAddCategory: () => void;
}) => {
  const [editedItem, setEditedItem] = useState<KnowledgeItem>(item);
  const [newKeyword, setNewKeyword] = useState("");
  const [newNegativeKeyword, setNewNegativeKeyword] = useState("");
  const [newGuideTitle, setNewGuideTitle] = useState("");
  const [newGuideUrl, setNewGuideUrl] = useState("");
  const [newGuideIcon, setNewGuideIcon] = useState("📘");

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

  const handleAddNegativeKeyword = () => {
    const negKeywords = editedItem.negativeKeywords || [];
    if (newNegativeKeyword.trim() && !negKeywords.includes(newNegativeKeyword.trim())) {
      setEditedItem({
        ...editedItem,
        negativeKeywords: [...negKeywords, newNegativeKeyword.trim()]
      });
      setNewNegativeKeyword("");
    }
  };

  const handleRemoveNegativeKeyword = (keyword: string) => {
    setEditedItem({
      ...editedItem,
      negativeKeywords: (editedItem.negativeKeywords || []).filter(k => k !== keyword)
    });
  };

  const handleAddGuide = () => {
    if (!newGuideTitle.trim() || !newGuideUrl.trim()) {
      toast.error("가이드 제목과 URL을 입력해주세요.");
      return;
    }
    const guides = editedItem.relatedGuides || [];
    setEditedItem({
      ...editedItem,
      relatedGuides: [...guides, {
        title: newGuideTitle.trim(),
        url: newGuideUrl.trim(),
        icon: newGuideIcon.trim() || "📘"
      }]
    });
    setNewGuideTitle("");
    setNewGuideUrl("");
    setNewGuideIcon("📘");
  };

  const handleRemoveGuide = (index: number) => {
    const guides = editedItem.relatedGuides || [];
    setEditedItem({
      ...editedItem,
      relatedGuides: guides.filter((_, i) => i !== index)
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
              <SelectItem value="faq">FAQ (자주묻는질문)</SelectItem>
              <SelectItem value="error">Error (오류 해결)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>카테고리 *</Label>
          <div className="flex gap-2">
            <Select
              value={editedItem.category}
              onValueChange={(value) => setEditedItem({ ...editedItem, category: value })}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>새 카테고리 추가</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>카테고리명</Label>
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="예: 새카테고리"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleAddCategory();
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                      setIsCategoryDialogOpen(false);
                      setNewCategory("");
                    }}>
                      취소
                    </Button>
                    <Button onClick={handleAddCategory}>
                      추가
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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

      <div>
        <Label>제외 키워드 (Negative Keywords)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          이 키워드가 질문에 포함되면 이 항목이 선택되지 않습니다.
        </p>
        <div className="flex gap-2 mb-2">
          <Input
            value={newNegativeKeyword}
            onChange={(e) => setNewNegativeKeyword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddNegativeKeyword()}
            placeholder="제외 키워드 입력 후 Enter"
          />
          <Button type="button" onClick={handleAddNegativeKeyword} size="sm">
            추가
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(editedItem.negativeKeywords || []).map((keyword, idx) => (
            <Badge key={idx} variant="destructive" className="cursor-pointer" onClick={() => handleRemoveNegativeKeyword(keyword)}>
              {keyword} ×
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>날짜 템플릿 (Date Template)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          날짜가 포함된 질문에 대응하는 템플릿 항목인 경우 체크하세요. {"{date}"}, {"{deadline}"} 변수를 사용할 수 있습니다.
        </p>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={editedItem.dateTemplate || false}
            onChange={(e) => setEditedItem({ ...editedItem, dateTemplate: e.target.checked })}
            className="w-4 h-4"
          />
          <Label className="cursor-pointer">날짜 템플릿 항목으로 설정</Label>
        </div>
      </div>

      <div>
        <Label>관련 가이드 (Related Guides)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          답변 하단에 표시될 관련 가이드 링크를 추가하세요.
        </p>
        <div className="space-y-2 mb-2">
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={newGuideTitle}
              onChange={(e) => setNewGuideTitle(e.target.value)}
              placeholder="가이드 제목"
            />
            <Input
              value={newGuideUrl}
              onChange={(e) => setNewGuideUrl(e.target.value)}
              placeholder="URL (https://...)"
            />
            <div className="flex gap-2">
              <Input
                value={newGuideIcon}
                onChange={(e) => setNewGuideIcon(e.target.value)}
                placeholder="아이콘 (📘)"
                className="w-20"
              />
              <Button type="button" onClick={handleAddGuide} size="sm">
                추가
              </Button>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {(editedItem.relatedGuides || []).map((guide, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 border rounded">
              <span>{guide.icon || "📘"}</span>
              <span className="flex-1 text-sm">{guide.title}</span>
              <a href={guide.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                {guide.url}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveGuide(idx)}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
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

// FAQ 관리 섹션 컴포넌트
const FAQManagementSection = () => {
  const [faqItems, setFaqItems] = useState<FAQItem[]>(faqData.items as FAQItem[]);
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
  const [isFaqDialogOpen, setIsFaqDialogOpen] = useState(false);
  const [faqSearchQuery, setFaqSearchQuery] = useState("");
  const [faqFilterCategory, setFaqFilterCategory] = useState<string>("all");

  const createNewFAQ = (): FAQItem => ({
    id: `faq_${Date.now()}`,
    question: "",
    category: faqData.categories[0] || "세금계산서",
    order: faqItems.length + 1,
    content: []
  });

  const handleSaveFAQ = (faq: FAQItem) => {
    if (!faq.question) {
      toast.error("질문을 입력해주세요!");
      return;
    }

    const existingIndex = faqItems.findIndex(f => f.id === faq.id);
    let newFaqItems;
    
    if (existingIndex >= 0) {
      newFaqItems = [...faqItems];
      newFaqItems[existingIndex] = faq;
      toast.success("FAQ가 수정되었습니다!");
    } else {
      newFaqItems = [...faqItems, faq];
      toast.success("새 FAQ가 추가되었습니다!");
    }
    
    setFaqItems(newFaqItems);
    setIsFaqDialogOpen(false);
    setEditingFaq(null);
    
    // JSON 파일 형식으로 다운로드 안내
    toast.info("변경사항을 저장하려면 'FAQ JSON 다운로드' 버튼을 클릭하여 파일을 다운로드하고, src/data/barobill-faq.json 파일을 교체해주세요.", {
      duration: 5000
    });
  };

  const handleDeleteFAQ = (id: string) => {
    if (confirm("정말 이 FAQ를 삭제하시겠습니까?")) {
      setFaqItems(faqItems.filter(f => f.id !== id));
      toast.success("FAQ가 삭제되었습니다!");
    }
  };

  const filteredFaqs = useMemo(() => {
    let filtered = faqItems;
    
    if (faqSearchQuery.trim()) {
      const query = faqSearchQuery.toLowerCase();
      filtered = filtered.filter(faq =>
        faq.question.toLowerCase().includes(query) ||
        (faq.answer && faq.answer.toLowerCase().includes(query)) ||
        (faq.content && faq.content.some(block => 
          block.type === "text" && block.content?.toLowerCase().includes(query)
        ))
      );
    }
    
    if (faqFilterCategory !== "all") {
      filtered = filtered.filter(faq => faq.category === faqFilterCategory);
    }
    
    return filtered.sort((a, b) => (a.order || 999) - (b.order || 999));
  }, [faqItems, faqSearchQuery, faqFilterCategory]);

  const handleDownloadFAQ = () => {
    // JSON 파일 형식에 맞게 데이터 구성
    const jsonData = {
      metadata: {
        ...faqData.metadata,
        updated_at: new Date().toISOString().split("T")[0]
      },
      categories: faqData.categories,
      items: faqItems.map(item => {
        // JSON 형식에 맞게 정리
        const jsonItem: any = {
          id: item.id,
          question: item.question,
          category: item.category
        };
        
        // order가 있으면 추가
        if (item.order !== undefined) {
          jsonItem.order = item.order;
        }
        
        // content 배열이 있으면 추가
        if (item.content && item.content.length > 0) {
          jsonItem.content = item.content;
        }
        
        // answer가 있으면 추가 (하위 호환성)
        if (item.answer) {
          jsonItem.answer = item.answer;
        }
        
        // images가 있으면 추가 (하위 호환성)
        if (item.images && item.images.length > 0) {
          jsonItem.images = item.images;
        }
        
        // relatedGuides가 있으면 추가
        if (item.relatedGuides && item.relatedGuides.length > 0) {
          jsonItem.relatedGuides = item.relatedGuides;
        }
        
        // relatedKnowledgeId가 있으면 추가
        if (item.relatedKnowledgeId) {
          jsonItem.relatedKnowledgeId = item.relatedKnowledgeId;
        }
        
        return jsonItem;
      })
    };
    
    const dataStr = JSON.stringify(jsonData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `barobill-faq.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("FAQ JSON 파일이 다운로드되었습니다! src/data/barobill-faq.json 파일을 교체해주세요.");
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">FAQ 관리</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadFAQ}>
              <Download className="w-4 h-4 mr-2" />
              FAQ JSON 다운로드
            </Button>
            <Dialog open={isFaqDialogOpen} onOpenChange={setIsFaqDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  data-faq-add-button
                  onClick={() => {
                    setEditingFaq(createNewFAQ());
                    setIsFaqDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  새 FAQ 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingFaq?.question ? "FAQ 수정" : "새 FAQ 추가"}
                  </DialogTitle>
                </DialogHeader>
                {editingFaq && (
                  <FAQEditor faq={editingFaq} onSave={handleSaveFAQ} onCancel={() => {
                    setIsFaqDialogOpen(false);
                    setEditingFaq(null);
                  }} categories={faqData.categories} />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap mb-6">
          <div className="flex-1 min-w-[200px]">
            <Label>검색</Label>
            <Input
              placeholder="질문으로 검색..."
              value={faqSearchQuery}
              onChange={(e) => setFaqSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-[200px]">
            <Label>카테고리 필터</Label>
            <Select value={faqFilterCategory} onValueChange={setFaqFilterCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {faqData.categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {filteredFaqs.map((faq) => (
            <Card key={faq.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{faq.category}</Badge>
                    {faq.order && <Badge variant="secondary">순서: {faq.order}</Badge>}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                  {faq.answer && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {faq.answer}
                    </p>
                  )}
                  {faq.content && faq.content.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      콘텐츠 블록: {faq.content.length}개
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingFaq(faq);
                      setIsFaqDialogOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteFAQ(faq.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredFaqs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            검색 결과가 없습니다.
          </div>
        )}
      </Card>
    </div>
  );
};

// FAQ 에디터 컴포넌트
const FAQEditor = ({ faq, onSave, onCancel, categories }: {
  faq: FAQItem;
  onSave: (faq: FAQItem) => void;
  onCancel: () => void;
  categories: string[];
}) => {
  const [editedFaq, setEditedFaq] = useState<FAQItem>(faq);
  const [newContentType, setNewContentType] = useState<"text" | "image">("text");
  const [newTextContent, setNewTextContent] = useState("");
  const [newImageSrc, setNewImageSrc] = useState("");
  const [newImageAlt, setNewImageAlt] = useState("");
  const [newImageCaption, setNewImageCaption] = useState("");
  const [newGuideTitle, setNewGuideTitle] = useState("");
  const [newGuideUrl, setNewGuideUrl] = useState("");
  const [newGuideIcon, setNewGuideIcon] = useState("📘");

  const handleAddContent = () => {
    if (newContentType === "text" && !newTextContent.trim()) {
      toast.error("텍스트 내용을 입력해주세요.");
      return;
    }
    if (newContentType === "image" && !newImageSrc.trim()) {
      toast.error("이미지 경로를 입력해주세요.");
      return;
    }

    const content = editedFaq.content || [];
    if (newContentType === "text") {
      content.push({
        type: "text",
        content: newTextContent.trim()
      });
      setNewTextContent("");
    } else {
      content.push({
        type: "image",
        src: newImageSrc.trim(),
        alt: newImageAlt.trim() || undefined,
        caption: newImageCaption.trim() || undefined
      });
      setNewImageSrc("");
      setNewImageAlt("");
      setNewImageCaption("");
    }
    setEditedFaq({ ...editedFaq, content });
  };

  const handleRemoveContent = (index: number) => {
    const content = editedFaq.content || [];
    setEditedFaq({
      ...editedFaq,
      content: content.filter((_, i) => i !== index)
    });
  };

  const handleMoveContent = (index: number, direction: "up" | "down") => {
    const content = [...(editedFaq.content || [])];
    if (direction === "up" && index > 0) {
      [content[index - 1], content[index]] = [content[index], content[index - 1]];
    } else if (direction === "down" && index < content.length - 1) {
      [content[index], content[index + 1]] = [content[index + 1], content[index]];
    }
    setEditedFaq({ ...editedFaq, content });
  };

  const handleAddGuide = () => {
    if (!newGuideTitle.trim() || !newGuideUrl.trim()) {
      toast.error("가이드 제목과 URL을 입력해주세요.");
      return;
    }
    const guides = editedFaq.relatedGuides || [];
    setEditedFaq({
      ...editedFaq,
      relatedGuides: [...guides, {
        title: newGuideTitle.trim(),
        url: newGuideUrl.trim(),
        icon: newGuideIcon.trim() || "📘"
      }]
    });
    setNewGuideTitle("");
    setNewGuideUrl("");
    setNewGuideIcon("📘");
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>질문 *</Label>
        <Input
          value={editedFaq.question}
          onChange={(e) => setEditedFaq({ ...editedFaq, question: e.target.value })}
          placeholder="예: 세금계산서 발급 방법은?"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>카테고리 *</Label>
          <Select
            value={editedFaq.category}
            onValueChange={(value) => setEditedFaq({ ...editedFaq, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>순서</Label>
          <Input
            type="number"
            value={editedFaq.order || ""}
            onChange={(e) => setEditedFaq({ ...editedFaq, order: parseInt(e.target.value) || undefined })}
            placeholder="숫자가 작을수록 먼저 표시"
          />
        </div>
      </div>

      {/* Content 배열 관리 */}
      <div>
        <Label>콘텐츠 (텍스트와 이미지 교차 배치)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          텍스트와 이미지를 원하는 순서로 배치할 수 있습니다.
        </p>
        
        {/* 기존 콘텐츠 표시 */}
        <div className="space-y-2 mb-4">
          {(editedFaq.content || []).map((block, idx) => (
            <Card key={idx} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Badge variant={block.type === "text" ? "default" : "secondary"} className="mb-2">
                    {block.type === "text" ? "텍스트" : "이미지"}
                  </Badge>
                  {block.type === "text" ? (
                    <p className="text-sm whitespace-pre-wrap">{block.content}</p>
                  ) : (
                    <div>
                      <p className="text-xs text-muted-foreground">경로: {block.src}</p>
                      {block.alt && <p className="text-xs text-muted-foreground">Alt: {block.alt}</p>}
                      {block.caption && <p className="text-xs text-muted-foreground">설명: {block.caption}</p>}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveContent(idx, "up")}
                    disabled={idx === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveContent(idx, "down")}
                    disabled={idx === (editedFaq.content?.length || 0) - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveContent(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* 새 콘텐츠 추가 */}
        <Card className="p-4 border-dashed">
          <div className="space-y-3">
            <div>
              <Label>콘텐츠 타입</Label>
              <Select value={newContentType} onValueChange={(value: "text" | "image") => setNewContentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">텍스트</SelectItem>
                  <SelectItem value="image">이미지</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newContentType === "text" ? (
              <div>
                <Label>텍스트 내용</Label>
                <Textarea
                  value={newTextContent}
                  onChange={(e) => setNewTextContent(e.target.value)}
                  placeholder="텍스트 내용 입력 (Markdown 지원: **굵게**, [메뉴명])"
                  rows={4}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <Label>이미지 경로 *</Label>
                  <Input
                    value={newImageSrc}
                    onChange={(e) => setNewImageSrc(e.target.value)}
                    placeholder="/faq-images/파일명.png"
                  />
                </div>
                <div>
                  <Label>Alt 텍스트</Label>
                  <Input
                    value={newImageAlt}
                    onChange={(e) => setNewImageAlt(e.target.value)}
                    placeholder="이미지 설명 (접근성)"
                  />
                </div>
                <div>
                  <Label>캡션</Label>
                  <Input
                    value={newImageCaption}
                    onChange={(e) => setNewImageCaption(e.target.value)}
                    placeholder="이미지 하단 설명 (선택)"
                  />
                </div>
              </div>
            )}

            <Button type="button" onClick={handleAddContent} className="w-full">
              콘텐츠 추가
            </Button>
          </div>
        </Card>
      </div>

      {/* 하위 호환성: answer 필드 (기존 구조) */}
      <div>
        <Label>답변 (하위 호환성 - content가 없을 때 사용)</Label>
        <Textarea
          value={editedFaq.answer || ""}
          onChange={(e) => setEditedFaq({ ...editedFaq, answer: e.target.value })}
          placeholder="간단한 답변 (content 배열 사용 시 비워도 됨)"
          rows={4}
        />
      </div>

      {/* 관련 가이드 */}
      <div>
        <Label>관련 가이드</Label>
        <p className="text-xs text-muted-foreground mb-2">
          답변 하단에 표시될 관련 가이드 링크를 추가하세요.
        </p>
        <div className="space-y-2 mb-2">
          {editedFaq.relatedGuides && editedFaq.relatedGuides.length > 0 && (
            <div className="space-y-2">
              {editedFaq.relatedGuides.map((guide, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                  <span>{guide.icon || "📘"}</span>
                  <span className="flex-1 text-sm">{guide.title}</span>
                  <a href={guide.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                    {guide.url}
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const guides = editedFaq.relatedGuides || [];
                      setEditedFaq({
                        ...editedFaq,
                        relatedGuides: guides.filter((_, i) => i !== idx)
                      });
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={newGuideTitle}
            onChange={(e) => setNewGuideTitle(e.target.value)}
            placeholder="가이드 제목"
            className="flex-1"
          />
          <Input
            value={newGuideUrl}
            onChange={(e) => setNewGuideUrl(e.target.value)}
            placeholder="URL"
            className="flex-1"
          />
          <Input
            value={newGuideIcon}
            onChange={(e) => setNewGuideIcon(e.target.value)}
            placeholder="아이콘 (선택)"
            className="w-20"
          />
          <Button type="button" onClick={handleAddGuide} size="sm">
            추가
          </Button>
        </div>
      </div>

      {/* 관련 지식베이스 ID */}
      <div>
        <Label>관련 지식베이스 ID (선택)</Label>
        <Input
          value={editedFaq.relatedKnowledgeId || ""}
          onChange={(e) => setEditedFaq({ ...editedFaq, relatedKnowledgeId: e.target.value || undefined })}
          placeholder="예: knowledge_tax_issuance"
        />
        <p className="text-xs text-muted-foreground mt-1">
          이 FAQ와 연결된 지식베이스 항목의 ID를 입력하세요.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button onClick={() => onSave(editedFaq)}>
          저장
        </Button>
      </div>
    </div>
  );
};

export default Admin;
