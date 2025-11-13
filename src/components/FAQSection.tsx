import { useState, useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Search } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

interface FAQSectionProps {
  faqs: FAQItem[];
}

const ITEMS_PER_PAGE = 10;

export const FAQSection = ({ faqs }: FAQSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter FAQs based on search query
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    
    const query = searchQuery.toLowerCase();
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        faq.category.toLowerCase().includes(query)
    );
  }, [faqs, searchQuery]);

  // Get unique categories from filtered FAQs
  const categories = useMemo(() => 
    Array.from(new Set(filteredFaqs.map(faq => faq.category))),
    [filteredFaqs]
  );

  // Paginate categories
  const totalPages = Math.ceil(categories.length / ITEMS_PER_PAGE);
  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return categories.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [categories, currentPage]);

  // Reset to page 1 when search query changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of FAQ section
    document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' });
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

      {filteredFaqs.length === 0 ? (
        <Card className="border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">검색 결과가 없습니다.</p>
        </Card>
      ) : (
        <>
          {paginatedCategories.map((category) => (
            <div key={category} className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">{category}</h3>
              <Card className="border-border bg-card">
                <Accordion type="multiple" className="w-full">
                  {filteredFaqs
                    .filter((faq) => faq.category === category)
                    .map((faq, index) => (
                      <AccordionItem key={index} value={`${category}-${index}`} className="border-border">
                        <AccordionTrigger className="px-4 text-left hover:no-underline hover:bg-muted/50 transition-colors">
                          <span className="font-medium">{faq.question}</span>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {faq.answer}
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>
              </Card>
            </div>
          ))}

          {totalPages > 1 && (
            <Pagination>
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
    </div>
  );
};
