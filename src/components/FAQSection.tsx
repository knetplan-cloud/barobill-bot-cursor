import { useState, useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

interface FAQSectionProps {
  faqs: FAQItem[];
}

const ITEMS_PER_PAGE = 7;

export const FAQSection = ({ faqs }: FAQSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("세금계산서");

  // Filter FAQs based on search query and active tab
  const filteredFaqs = useMemo(() => {
    let filtered = faqs;
    
    // If there's a search query, search across all tabs
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (faq) =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query)
      );
    } else {
      // If no search query, filter by active tab
      filtered = filtered.filter(faq => faq.category === activeTab);
    }
    
    return filtered;
  }, [faqs, searchQuery, activeTab]);

  // Paginate FAQs
  const totalPages = Math.ceil(filteredFaqs.length / ITEMS_PER_PAGE);
  const paginatedFaqs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredFaqs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredFaqs, currentPage]);

  // Reset to page 1 when search query or tab changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of FAQ section
    document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' });
    // Close all accordions by resetting the Accordion component
    const accordionTriggers = document.querySelectorAll('[data-state="open"]');
    accordionTriggers.forEach((trigger) => {
      if (trigger instanceof HTMLElement) {
        trigger.click();
      }
    });
  };

  return (
    <div id="faq-section" className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-bold text-foreground">자주 묻는 질문</h2>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="질문 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="세금계산서">세금계산서</TabsTrigger>
          <TabsTrigger value="인증서등록">인증서등록</TabsTrigger>
          <TabsTrigger value="바로빌서비스">바로빌서비스</TabsTrigger>
          <TabsTrigger value="세무정보">세무정보</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredFaqs.length === 0 ? (
            <Card className="border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">검색 결과가 없습니다.</p>
            </Card>
          ) : (
            <>
              <Card className="border-border bg-card max-h-[600px] overflow-y-auto">
                <Accordion type="multiple" className="w-full">
                  {paginatedFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`${activeTab}-${index}`} className="border-border">
                      <AccordionTrigger className="px-4 text-left hover:no-underline hover:bg-muted/50 transition-colors">
                        <span className="font-medium">{faq.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                          {faq.answer}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>

              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
