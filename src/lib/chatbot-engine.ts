import knowledgeBase from "@/data/barobill-knowledge-base.json";
import chatbotDataset from "@/data/barobill-chatbot-dataset.json";
import casesKnowledgeBase from "@/data/barobill-knowledge-base.cases.v3.json";

export type ToneType = "formal" | "casual";

interface MatchResult {
  found: boolean;
  response?: string;
  relatedGuides?: Array<{
    title: string;
    url: string;
    description: string;
    icon: string;
  }>;
  followUpQuestions?: string[];
  requiresAI?: boolean;
  query?: string;
}

// Normalize text for comparison (more aggressive for flexible matching)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[!?.,;:]/g, "") // Remove punctuation
    .replace(/\s+/g, " "); // Normalize whitespace
};

// Check if query contains any of the keywords (flexible partial matching)
const containsKeywords = (query: string, keywords: string[]): boolean => {
  const normalizedQuery = normalizeText(query);
  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    // Support partial matching: "안녕" matches "안녕하세요"
    return normalizedQuery.includes(normalizedKeyword) || 
           normalizedKeyword.includes(normalizedQuery);
  });
};

// Extract synonyms from dataset (including cases knowledge base)
const getSynonyms = (word: string): string[] => {
  const datasetSynonyms = (chatbotDataset as any).nlu?.synonyms || {};
  const casesSynonyms = (casesKnowledgeBase as any).synonyms || {};
  
  // Merge synonyms from both sources
  const allSynonyms = { ...datasetSynonyms, ...casesSynonyms };
  
  // Find the key that contains this word
  for (const [key, values] of Object.entries(allSynonyms)) {
    if (normalizeText(key) === normalizeText(word) || 
        (Array.isArray(values) && values.some(v => normalizeText(v) === normalizeText(word)))) {
      return [key, ...(Array.isArray(values) ? values : [])];
    }
  }
  
  return [word];
};

// Expand query with synonyms
const expandQueryWithSynonyms = (query: string): string[] => {
  const words = query.split(" ");
  const expandedQueries = [query];
  
  words.forEach(word => {
    const synonyms = getSynonyms(word);
    synonyms.forEach(synonym => {
      if (synonym !== word) {
        expandedQueries.push(query.replace(word, synonym));
      }
    });
  });
  
  return expandedQueries;
};

// Match query against intents, knowledge base, and dataset
export const matchQuery = (query: string, tone: ToneType): MatchResult => {
  const kb = knowledgeBase as any;
  const dataset = chatbotDataset as any;
  const casesKb = casesKnowledgeBase as any;
  const expandedQueries = expandQueryWithSynonyms(query);
  
  // PRIORITY 1: Check intents first (for greetings, system commands, etc.)
  const intents = dataset.intents || [];
  for (const intent of intents) {
    const patterns = intent.patterns || [];
    
    for (const expandedQuery of expandedQueries) {
      if (containsKeywords(expandedQuery, patterns)) {
        const responseType = tone === "formal" ? "polite" : "casual";
        const response = intent.response?.[responseType] || intent.response?.polite;
        
        if (response) {
          return {
            found: true,
            response: response,
            relatedGuides: [],
            followUpQuestions: [],
          };
        }
      }
    }
  }
  
  // PRIORITY 2: Try cases knowledge base (high priority for specific tax cases)
  const casesKnowledgeBaseItems = casesKb.knowledge_base || [];
  let bestMatch: { score: number; result: MatchResult | null } = { score: 0, result: null };
  
  for (const item of casesKnowledgeBaseItems) {
    const patterns = item.patterns || [];
    
    for (const expandedQuery of expandedQueries) {
      // Calculate match score based on pattern matches
      let matchScore = 0;
      
      for (const pattern of patterns) {
        if (containsKeywords(expandedQuery, [pattern])) {
          matchScore += 1;
          // Boost score for high priority items
          if (item.priority === "high") matchScore += 2;
          else if (item.priority === "mid") matchScore += 1;
        }
      }
      
      if (matchScore > bestMatch.score) {
        const responseType = tone === "formal" ? "formal" : "casual";
        const templateResponse = item.answer?.template?.[responseType];
        
        if (templateResponse) {
          bestMatch = {
            score: matchScore,
            result: {
              found: true,
              response: templateResponse,
              relatedGuides: item.answer?.links?.map((link: any) => ({
                title: link.title || "관련 링크",
                url: link.url || "#",
                description: link.description || "",
                icon: "📄",
              })) || [],
              followUpQuestions: [],
            }
          };
        }
      }
    }
  }
  
  // If we found a good match in cases knowledge base, return it
  if (bestMatch.score > 0 && bestMatch.result) {
    return bestMatch.result;
  }
  
  // PRIORITY 3: Try to find a match in original knowledge_base
  for (const [, item] of Object.entries(kb.knowledge_base || {})) {
    const entry = item as any;
    
    // Collect all keywords
    const allKeywords = [
      ...(entry.keywords?.primary || []),
      ...(entry.keywords?.secondary || []),
      ...(entry.keywords?.related || []),
    ];
    
    // Check if any expanded query matches
    for (const expandedQuery of expandedQueries) {
      if (containsKeywords(expandedQuery, allKeywords)) {
        const responseType = tone === "formal" ? "formal" : "casual";
        const response = entry.responses?.[responseType];
        
        if (response) {
          const fullResponse = [
            response.greeting,
            response.content,
            response.closing,
          ].filter(Boolean).join("\n\n");
          
          return {
            found: true,
            response: fullResponse,
            relatedGuides: entry.related_guides || [],
            followUpQuestions: entry.common_followups || [],
          };
        }
      }
    }
  }
  
  // PRIORITY 4: Try to find match in chatbot_dataset qa_pairs
  const qaPairs = dataset.qa_pairs || [];
  
  for (const pair of qaPairs) {
    const allKeywords = [
      ...(pair.keywords || []),
      ...(pair.synonyms || []),
    ];
    
    for (const expandedQuery of expandedQueries) {
      if (containsKeywords(expandedQuery, allKeywords)) {
        const answer = tone === "formal" ? pair.answer_polite : pair.answer_casual;
        
        if (answer) {
          return {
            found: true,
            response: answer,
            relatedGuides: pair.related_links || [],
            followUpQuestions: pair.follow_up || [],
          };
        }
      }
    }
  }
  
  // PRIORITY 5: Return fallback - request AI assistance
  const fallbacks = dataset.fallbacks || {};
  const fallbackMessages = fallbacks.out_of_scope || 
    "죄송합니다. 해당 질문에 대한 답변을 찾지 못했습니다. 다른 방식으로 질문해 주시거나, 바로빌 고객센터(1600-6399)로 문의해 주세요. 📞";
  
  return { 
    found: false,
    requiresAI: true,
    query: query,
    response: fallbackMessages
  };
};

// Detect tone from user input
export const detectTone = (query: string): ToneType => {
  const casualMarkers = ["해", "야", "어", "음", "ㅋ", "ㅎ", "요 없이"];
  const formalMarkers = ["습니다", "십시오", "세요", "요"];
  
  const hasCasual = casualMarkers.some((marker) => query.includes(marker));
  const hasFormal = formalMarkers.some((marker) => query.includes(marker));
  
  if (hasCasual && !hasFormal) return "casual";
  if (hasFormal && !hasCasual) return "formal";
  
  return "formal"; // Default to formal
};
