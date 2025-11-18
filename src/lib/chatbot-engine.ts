import unifiedData from "@/data/barobill-knowledge.json";
import { 
  extractDateFromQuery, 
  replaceDynamicVariables, 
  parseAmendmentReason,
  type ExtractedDate,
  type AmendmentReason
} from "./date-utils";

// 사용자가 설정 가능한 어투 타입
export type ToneType = "formal" | "casual" | "plain";

interface MatchResult {
  found: boolean;
  response?: string;
  relatedGuides?: Array<{
    title: string;
    url: string;
    description?: string;
    icon?: string;
  }>;
  followUpQuestions?: string[];
  relatedQuestions?: string[];
  score: number;
  requiresAI?: boolean;
  query?: string;
}

/**
 * 1. 텍스트 정규화: 띄어쓰기 제거, 소문자 변환, 특수문자 제거
 * 예: "세금계산서 발급 어떻게 해?" -> "세금계산서발급어떻게해"
 */
const normalizeText = (text: string): string => {
  return text.toLowerCase().replace(/[\s,.\?!~]/g, "");
};

/**
 * 2. 질문 확장: 동의어를 포함한 키워드 리스트 생성
 * 예: 질문에 "반품"이 있으면 -> ["반품", "환입", "환불", "리턴", "반환"] 모두 검색 대상에 포함
 */
const getExpandedKeywords = (query: string): string[] => {
  const normalizedQuery = normalizeText(query);
  // 기본 질문을 포함
  let keywords = [normalizedQuery];
  
  const synonyms = unifiedData.synonyms as Record<string, string[]>;
  
  Object.keys(synonyms).forEach(key => {
    const normalizedKey = normalizeText(key);
    // 질문에 '대표어'가 있거나 '동의어' 중 하나라도 있으면
    const hasKey = normalizedQuery.includes(normalizedKey);
    const hasSynonym = synonyms[key].some(s => normalizedQuery.includes(normalizeText(s)));

    if (hasKey || hasSynonym) {
      // 대표어와 동의어 모두를 검색 키워드에 추가
      keywords.push(normalizedKey);
      synonyms[key].forEach(s => keywords.push(normalizeText(s)));
    }
  });
  
  return [...new Set(keywords)]; // 중복 제거
};

/**
 * 3. 매칭 엔진: 점수 기반으로 최적의 답변 찾기
 */
export const matchQuery = (query: string, tone: ToneType): MatchResult => {
  // 날짜 추출 (동적 변수 치환을 위해)
  const extractedDate = extractDateFromQuery(query);
  
  // 수정사유 파싱 (수정세금계산서인 경우)
  const amendmentReason = parseAmendmentReason(query);
  
  // 날짜가 추출되면 키워드에 추가
  const dateKeywords: string[] = [];
  if (extractedDate) {
    dateKeywords.push(extractedDate.fullDate);
    dateKeywords.push(extractedDate.monthDay);
    dateKeywords.push(extractedDate.isoDate);
  }
  
  const expandedQueryKeywords = getExpandedKeywords(query); // 확장된 질문 키워드들
  const normalizedQuery = normalizeText(query);

  let bestMatch: any = null;
  let maxScore = 0;

  unifiedData.items.forEach((item) => {
    // Negative Keywords 체크: 제외 키워드가 있으면 이 항목은 제외
    if ((item as any).negativeKeywords && Array.isArray((item as any).negativeKeywords)) {
      const hasNegativeKeyword = (item as any).negativeKeywords.some((negKeyword: string) => {
        const normalizedNegKeyword = normalizeText(negKeyword);
        return normalizedQuery.includes(normalizedNegKeyword) || 
               expandedQueryKeywords.some(qKey => qKey.includes(normalizedNegKeyword));
      });
      
      if (hasNegativeKeyword) {
        return; // 이 항목은 제외
      }
    }
    
    let score = 0;
    
    // (1) 키워드 매칭 점수 계산
    // 아이템의 키워드가 확장된 질문 키워드 리스트에 포함되어 있는지 확인
    item.keywords.forEach((k) => {
      const normalizedItemKeyword = normalizeText(k);
      // 질문(또는 확장된 동의어)이 아이템의 키워드를 포함하고 있다면 점수 부여
      if (expandedQueryKeywords.some(qKey => qKey.includes(normalizedItemKeyword))) {
        score += 10; // 매칭된 키워드 하나당 10점
      }
    });
    
    // 날짜 키워드 매칭 (날짜가 추출된 경우)
    if (extractedDate && dateKeywords.length > 0) {
      item.keywords.forEach((k) => {
        const normalizedItemKeyword = normalizeText(k);
        // 날짜 관련 키워드가 있으면 추가 점수
        if (dateKeywords.some(dateKey => normalizeText(dateKey).includes(normalizedItemKeyword) ||
                                   normalizedItemKeyword.includes(normalizeText(dateKey)))) {
          score += 10;
        }
      });
      
      // 날짜 템플릿 항목인 경우 추가 점수
      if ((item as any).dateTemplate === true) {
        score += 15; // 날짜 템플릿 항목에 가산점
      }
    }

    // (2) 제목(Title) 정확도 가산점
    // 질문이 제목을 직접적으로 포함하면 큰 점수 부여
    if (item.title && normalizedQuery.includes(normalizeText(item.title))) {
      score += 20;
    }

    // (3) 우선순위(Priority) 가산점
    // case(사례)는 knowledge(일반지식)보다 우선순위를 높게 설정하여 구체적 질문에 대응
    if (item.priority) {
      score += item.priority;
    }

    // 최고 점수 갱신
    if (score > maxScore) {
      maxScore = score;
      bestMatch = item;
    }
  });

  // (4) 임계점(Threshold): 점수가 너무 낮으면(예: 15점 미만) 답변하지 않고 AI로 넘김
  if (maxScore < 15 || !bestMatch) {
    return { 
      found: false, 
      score: 0,
      requiresAI: true,
      query: query,
      response: "죄송합니다. 해당 질문에 대한 답변을 찾지 못했습니다. AI가 답변을 생성 중입니다..."
    };
  }

  // (5) 어투에 맞는 답변 반환 (없으면 formal을 기본값으로)
  let responseText = bestMatch.responses[tone] || bestMatch.responses["formal"];
  
  // 동적 변수 치환 ({date}, {deadline}, {today}, {issueDeadline}, {vatDeadline}, {amendmentDeadline}, {penaltyInfo})
  responseText = replaceDynamicVariables(responseText, extractedDate, amendmentReason);

  return {
    found: true,
    score: maxScore,
    response: responseText,
    relatedGuides: bestMatch.relatedGuides || [],
    followUpQuestions: bestMatch.followUpQuestions || [],
    relatedQuestions: (bestMatch as any).relatedQuestions || []
  };
};

/**
 * 사용자의 말투를 감지하여 톤을 추천해주는 함수
 */
export const detectTone = (query: string): ToneType => {
  // 반말 감지
  if (query.includes("야") || query.includes("어") || query.includes("니") || query.includes("ㅋ")) {
    return "casual";
  }
  
  // 존댓말 감지
  if (query.includes("요") || query.includes("니다") || query.includes("세요") || query.includes("십시오")) {
    return "formal";
  }
  
  // 기본값: formal
  return "formal";
};
