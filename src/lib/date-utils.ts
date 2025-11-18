/**
 * 날짜 패턴 추출 및 신고 마감일 계산 유틸리티
 * 세무 전문가 수준의 날짜 계산 및 가산세 판단 로직
 */

export interface ExtractedDate {
  fullDate: string;      // "2025년 11월 20일"
  monthDay: string;      // "11월 20일"
  isoDate: string;       // "2025-11-20"
  year?: number;
  month?: number;
  day?: number;
}

export type AmendmentReason = 
  | "환입" 
  | "계약해제" 
  | "공급가액변동" 
  | "착오정정" 
  | "이중발급" 
  | "내국신용장사후개설";

export interface PenaltyResult {
  type: "없음" | "지연발급" | "미발급" | "지연전송" | "미전송";
  rate: number;
  message: string;
}

/**
 * 2025년 한국 법정 공휴일 목록 (대체 공휴일 포함)
 * 형식: "YYYY-MM-DD"
 */
export const KOREAN_HOLIDAYS_2025: string[] = [
  "2025-01-01", // 신정
  "2025-01-28", // 설날
  "2025-01-29", // 설날
  "2025-01-30", // 설날 (대체공휴일)
  "2025-03-01", // 삼일절
  "2025-05-05", // 어린이날
  "2025-05-06", // 부처님오신날
  "2025-06-06", // 현충일
  "2025-08-15", // 광복절
  "2025-10-03", // 개천절
  "2025-10-06", // 추석
  "2025-10-07", // 추석
  "2025-10-08", // 추석 (대체공휴일)
  "2025-10-09", // 한글날
  "2025-12-25"  // 크리스마스
];

/**
 * 2026년 한국 법정 공휴일 목록 (1~2월)
 * 부가세 신고기한(1/25) 계산에 필요
 */
export const KOREAN_HOLIDAYS_2026_JAN: string[] = [
  "2026-01-01", // 신정
  "2026-02-16", // 설날 전날 (음력 12월 29일)
  "2026-02-17", // 설날 (음력 1월 1일)
  "2026-02-18", // 설날 다음날
];

/**
 * 연도별 공휴일 통합 조회
 */
export function getKoreanHolidays(year: number): string[] {
  if (year === 2025) return KOREAN_HOLIDAYS_2025;
  if (year === 2026) return [...KOREAN_HOLIDAYS_2026_JAN, "2026-03-01", "2026-05-05", "2026-06-06", "2026-08-15", "2026-10-03", "2026-10-09", "2026-12-25"];
  
  // 미래 연도는 기본 공휴일만 반환 (음력 공휴일 제외)
  return [
    `${year}-01-01`, // 신정
    `${year}-03-01`, // 삼일절
    `${year}-05-05`, // 어린이날
    `${year}-06-06`, // 현충일
    `${year}-08-15`, // 광복절
    `${year}-10-03`, // 개천절
    `${year}-10-09`, // 한글날
    `${year}-12-25`, // 성탄절
  ];
}

/**
 * 주말 여부 확인
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 일요일(0), 토요일(6)
}

/**
 * 공휴일 여부 확인 (Supabase에서 동적으로 조회)
 * 
 * @param date - 확인할 날짜
 * @param customHolidays - Supabase에서 가져온 사용자 지정 공휴일 목록 (선택)
 * @returns 공휴일 여부
 */
export async function isHoliday(date: Date, customHolidays?: string[]): Promise<boolean> {
  // 기본 공휴일 체크
  const defaultHolidays = getKoreanHolidays(date.getFullYear());
  const dateStr = formatDateISO(date);
  
  if (defaultHolidays.includes(dateStr)) {
    return true;
  }
  
  // 사용자 지정 공휴일 체크 (Supabase에서 가져온 경우)
  if (customHolidays && customHolidays.includes(dateStr)) {
    return true;
  }
  
  return false;
}

/**
 * 공휴일 여부 확인 (동기 버전 - 기본 공휴일만)
 */
export function isHolidaySync(date: Date): boolean {
  const holidays = getKoreanHolidays(date.getFullYear());
  const dateStr = formatDateISO(date);
  return holidays.includes(dateStr);
}

/**
 * 영업일 여부 확인 (동기 버전)
 */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHolidaySync(date);
}

/**
 * 다음 영업일 반환
 */
export function getNextBusinessDay(date: Date): Date {
  const result = new Date(date);
  while (!isBusinessDay(result)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

/**
 * 마감일 조정 (공휴일/주말이면 다음 영업일로)
 */
export function adjustDeadline(date: Date): Date {
  return getNextBusinessDay(date);
}

/**
 * 날짜를 ISO 형식으로 포맷 (공휴일 체크용)
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * ExtractedDate를 Date 객체로 변환
 */
export function extractedDateToDate(date: ExtractedDate): Date {
  if (!date.year || !date.month || !date.day) {
    throw new Error("Invalid date: year, month, day are required");
  }
  return new Date(date.year, date.month - 1, date.day);
}

/**
 * 날짜를 한글 형식으로 포맷
 */
export function formatDateKorean(date: ExtractedDate | { year: number; month: number; day: number }): string {
  return `${date.year}년 ${date.month}월 ${date.day}일`;
}

/**
 * 한글 날짜 문자열을 Date 객체로 파싱
 */
export function parseDeadlineToDate(deadline: string): Date {
  const match = deadline.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (match) {
    return new Date(
      parseInt(match[1]),
      parseInt(match[2]) - 1,
      parseInt(match[3])
    );
  }
  return new Date();
}

/**
 * 질문에서 날짜 패턴을 추출합니다.
 * 다양한 날짜 형식을 지원합니다.
 */
export const extractDateFromQuery = (query: string): ExtractedDate | null => {
  // 패턴 1: "2025년 11월 20일" 형식
  const fullDateMatch = query.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (fullDateMatch) {
    const [, year, month, day] = fullDateMatch;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    
    return {
      fullDate: `${year}년 ${month}월 ${day}일`,
      monthDay: `${month}월 ${day}일`,
      isoDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      year: yearNum,
      month: monthNum,
      day: dayNum
    };
  }
  
  // 패턴 2: "11월 20일" 형식 (년도 없음 - 현재 년도 추정)
  const monthDayMatch = query.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (monthDayMatch && !fullDateMatch) {
    const [, month, day] = monthDayMatch;
    const currentYear = new Date().getFullYear();
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    
    return {
      fullDate: `${currentYear}년 ${month}월 ${day}일`,
      monthDay: `${month}월 ${day}일`,
      isoDate: `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      year: currentYear,
      month: monthNum,
      day: dayNum
    };
  }
  
  // 패턴 3: "2025-11-20" 또는 "2025/11/20" 형식
  const isoDateMatch = query.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    
    return {
      fullDate: `${year}년 ${month}월 ${day}일`,
      monthDay: `${month}월 ${day}일`,
      isoDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      year: yearNum,
      month: monthNum,
      day: dayNum
    };
  }
  
  // 패턴 4: "11.20" 형식 (월일만, 현재 년도 추정)
  const dotDateMatch = query.match(/(\d{1,2})\.(\d{1,2})/);
  if (dotDateMatch && !fullDateMatch && !monthDayMatch && !isoDateMatch) {
    const [, month, day] = dotDateMatch;
    const currentYear = new Date().getFullYear();
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    
    // 월이 1-12 범위인지 확인
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return {
        fullDate: `${currentYear}년 ${month}월 ${day}일`,
        monthDay: `${month}월 ${day}일`,
        isoDate: `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        year: currentYear,
        month: monthNum,
        day: dayNum
      };
    }
  }
  
  // 패턴 5: "11월 거래분" 같은 불완전한 날짜 (월만 있는 경우)
  const monthOnlyMatch = query.match(/(\d{1,2})월\s*거래/);
  if (monthOnlyMatch && !fullDateMatch && !monthDayMatch) {
    const [, month] = monthOnlyMatch;
    const currentYear = new Date().getFullYear();
    const monthNum = parseInt(month);
    
    if (monthNum >= 1 && monthNum <= 12) {
      // 월만 있는 경우, 해당 월의 첫째 날로 추정
      return {
        fullDate: `${currentYear}년 ${month}월`,
        monthDay: `${month}월`,
        isoDate: `${currentYear}-${month.padStart(2, '0')}-01`,
        year: currentYear,
        month: monthNum,
        day: 1
      };
    }
  }
  
  return null;
};

/**
 * 세금계산서 발급 마감일 계산
 * 규칙: 공급일이 속하는 달의 다음 달 10일 (공휴일/주말 시 연장)
 * 
 * @param supplyDate - 공급일 (거래일)
 * @returns 포맷된 마감일 문자열 (예: "2025년 11월 10일")
 */
export function getInvoiceIssuanceDeadline(supplyDate: ExtractedDate): string {
  if (!supplyDate.year || !supplyDate.month) {
    return "";
  }
  
  const year = supplyDate.year;
  const month = supplyDate.month;
  
  // 다음 달 10일 계산
  let deadlineYear = year;
  let deadlineMonth = month + 1;
  
  if (deadlineMonth > 12) {
    deadlineMonth = 1;
    deadlineYear += 1;
  }
  
  const deadline = new Date(deadlineYear, deadlineMonth - 1, 10);
  const adjusted = adjustDeadline(deadline);
  
  return formatDateKorean({
    year: adjusted.getFullYear(),
    month: adjusted.getMonth() + 1,
    day: adjusted.getDate()
  });
}

/**
 * 부가세 신고기한 계산 (예정신고 + 확정신고 통합)
 * 
 * 규칙:
 * - 1~3월 거래 → 4월 25일 (1기 예정, 법인)
 * - 4~6월 거래 → 7월 25일 (1기 확정)
 * - 7~9월 거래 → 10월 25일 (2기 예정, 법인)
 * - 10~12월 거래 → 다음해 1월 25일 (2기 확정)
 * - 공휴일/주말이면 다음 영업일로 연장
 * 
 * @param transactionDate - 거래일
 * @returns 포맷된 마감일 문자열
 */
export function getVatFilingDeadline(transactionDate: ExtractedDate): string {
  if (!transactionDate.year || !transactionDate.month) {
    return "";
  }
  
  const year = transactionDate.year;
  const month = transactionDate.month;
  
  let deadline: Date;
  
  if (month >= 1 && month <= 3) {
    // 1기 예정 (법인) → 4월 25일
    deadline = new Date(year, 3, 25); // 4월 = index 3
  } else if (month >= 4 && month <= 6) {
    // 1기 확정 (개인, 법인) → 7월 25일
    deadline = new Date(year, 6, 25); // 7월 = index 6
  } else if (month >= 7 && month <= 9) {
    // 2기 예정 (법인) → 10월 25일
    deadline = new Date(year, 9, 25); // 10월 = index 9
  } else {
    // 2기 확정 (개인, 법인) → 다음해 1월 25일
    deadline = new Date(year + 1, 0, 25); // 1월 = index 0
  }
  
  const adjusted = adjustDeadline(deadline);
  
  return formatDateKorean({
    year: adjusted.getFullYear(),
    month: adjusted.getMonth() + 1,
    day: adjusted.getDate()
  });
}

/**
 * Date 객체 버전 (내부 계산용)
 */
export function getVatFilingDeadlineAsDate(transactionDate: Date): Date {
  const year = transactionDate.getFullYear();
  const month = transactionDate.getMonth() + 1; // 1~12월
  
  let deadline: Date;
  
  if (month >= 1 && month <= 3) {
    deadline = new Date(year, 3, 25);
  } else if (month >= 4 && month <= 6) {
    deadline = new Date(year, 6, 25);
  } else if (month >= 7 && month <= 9) {
    deadline = new Date(year, 9, 25);
  } else {
    deadline = new Date(year + 1, 0, 25);
  }
  
  return adjustDeadline(deadline);
}

/**
 * 세금계산서 전송 마감일 계산
 * 규칙: 발급일(전자서명일) 다음 날까지 국세청 전송
 * 
 * @param issueDate - 발급일
 * @returns 포맷된 마감일 문자열
 */
export function getInvoiceTransmissionDeadline(issueDate: Date): string {
  const nextDay = new Date(issueDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  const adjusted = adjustDeadline(nextDay);
  
  return formatDateKorean({
    year: adjusted.getFullYear(),
    month: adjusted.getMonth() + 1,
    day: adjusted.getDate()
  });
}

/**
 * 수정세금계산서 발급기한 계산
 * 
 * ⚠️ 핵심: 사유에 따라 기준일과 마감일이 완전히 다름!
 * 
 * A. "사유 발생일" 기준 (가산세 위험 O)
 *    - 환입, 계약해제, 공급가액변동
 *    - 마감일 = 사유발생일의 다음 달 10일
 * 
 * B. "원본 작성일" 기준 (가산세 위험 X)
 *    - 착오정정, 이중발급, 내국신용장사후개설
 *    - 마감일 = 원본의 부가세 확정신고기한
 * 
 * @param reason - 수정 사유
 * @param eventDate - 사유 발생일 또는 원본 거래일
 * @returns 포맷된 마감일 문자열
 */
export function getAmendmentDeadline(
  reason: AmendmentReason,
  eventDate: ExtractedDate
): string {
  // A. 사유 발생일 기준
  if (reason === "환입" || reason === "계약해제" || reason === "공급가액변동") {
    return getInvoiceIssuanceDeadline(eventDate);
  }
  
  // B. 원본 작성일 기준
  if (reason === "착오정정" || reason === "이중발급" || reason === "내국신용장사후개설") {
    return getVatFilingDeadline(eventDate);
  }
  
  // 기본값
  return getVatFilingDeadline(eventDate);
}

/**
 * 수정세금계산서 작성일자 규칙 반환
 */
export function getAmendmentWriteDate(
  reason: AmendmentReason,
  eventDate: ExtractedDate,
  originalDate?: ExtractedDate
): string {
  // A. 사유 발생일로 작성
  if (reason === "환입" || reason === "계약해제" || reason === "공급가액변동") {
    return formatDateKorean(eventDate) + " (사유 발생일)";
  }
  
  // B. 원본 작성일 고정
  if (reason === "착오정정" || reason === "이중발급" || reason === "내국신용장사후개설") {
    const date = originalDate || eventDate;
    return formatDateKorean(date) + " (원본 작성일 고정)";
  }
  
  return formatDateKorean(eventDate);
}

/**
 * 수정세금계산서 사유별 키워드 매핑
 */
export const AMENDMENT_KEYWORDS: Record<AmendmentReason, string[]> = {
  "환입": [
    "반품", "환불", "환입", "리턴", "반환", "되돌려", "돌려보내", 
    "돌려받", "취소됐", "물건돌려"
  ],
  "계약해제": [
    "계약해제", "계약취소", "계약파기", "해제", "파기", "무효", 
    "계약무효", "계약철회", "전부취소"
  ],
  "공급가액변동": [
    "할인", "추가청구", "금액변동", "가격변경", "단가변경", 
    "증가", "감소", "추가금액", "에누리", "가격조정"
  ],
  "착오정정": [
    "오타", "오류", "잘못", "착오", "정정", "틀림", "틀렸", 
    "주소오류", "상호오류", "사업자번호", "기재사항"
  ],
  "이중발급": [
    "중복", "이중", "두번", "2번", "두 번", "같은거또", 
    "또발급", "중복발급", "두장"
  ],
  "내국신용장사후개설": [
    "내국신용장", "신용장", "사후개설", "영세율", "0%", 
    "영세", "LC", "엘씨"
  ]
};

/**
 * 사유별 제외 키워드 (이 키워드가 있으면 해당 사유가 아님)
 */
export const AMENDMENT_NEGATIVE_KEYWORDS: Record<AmendmentReason, string[]> = {
  "환입": ["계약취소", "오타", "중복"],
  "계약해제": ["반품", "환불", "오타"],
  "공급가액변동": ["반품", "오타", "취소"],
  "착오정정": ["반품", "취소", "할인", "중복"],
  "이중발급": ["반품", "착오정정", "오타"],
  "내국신용장사후개설": ["반품", "오타"]
};

/**
 * 질문에서 수정세금계산서 사유 추출
 * 
 * @param question - 사용자 질문
 * @returns 추출된 수정 사유 또는 null
 */
export function parseAmendmentReason(question: string): AmendmentReason | null {
  const normalizedQuestion = question.toLowerCase().replace(/\s/g, "");
  
  // 각 사유별 점수 계산
  const scores: Record<AmendmentReason, number> = {
    "환입": 0,
    "계약해제": 0,
    "공급가액변동": 0,
    "착오정정": 0,
    "이중발급": 0,
    "내국신용장사후개설": 0
  };
  
  // 키워드 매칭 점수 계산
  for (const [reason, keywords] of Object.entries(AMENDMENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedQuestion.includes(keyword.replace(/\s/g, ""))) {
        scores[reason as AmendmentReason] += 10;
      }
    }
  }
  
  // 제외 키워드로 점수 감점
  for (const [reason, negKeywords] of Object.entries(AMENDMENT_NEGATIVE_KEYWORDS)) {
    for (const keyword of negKeywords) {
      if (normalizedQuestion.includes(keyword.replace(/\s/g, ""))) {
        scores[reason as AmendmentReason] -= 20;
      }
    }
  }
  
  // 최고 점수 사유 반환
  let maxScore = 0;
  let bestReason: AmendmentReason | null = null;
  
  for (const [reason, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestReason = reason as AmendmentReason;
    }
  }
  
  // 최소 점수 미달 시 null 반환
  return maxScore >= 10 ? bestReason : null;
}

/**
 * 가산세 발생 여부 및 정보 판단
 * 
 * @param transactionDate - 거래일
 * @param reason - 수정 사유 (수정발급인 경우)
 * @param today - 현재 날짜
 * @returns 가산세 정보 문자열
 */
export function getPenaltyInfo(
  transactionDate: ExtractedDate,
  reason: AmendmentReason | null,
  today: Date = new Date()
): string {
  if (!transactionDate.year || !transactionDate.month) {
    return "";
  }
  
  const issueDeadline = parseDeadlineToDate(getInvoiceIssuanceDeadline(transactionDate));
  const vatDeadline = parseDeadlineToDate(getVatFilingDeadline(transactionDate));
  
  // 수정세금계산서인 경우
  if (reason) {
    const amendDeadline = parseDeadlineToDate(getAmendmentDeadline(reason, transactionDate));
    
    // 원본 작성일 기준 사유 (착오정정, 이중발급)
    if (reason === "착오정정" || reason === "이중발급" || reason === "내국신용장사후개설") {
      if (today <= vatDeadline) {
        return "✅ 가산세 없음 (부가세 확정신고기한 이내)";
      } else {
        return "⚠️ 확정신고기한 경과 - 세무사 상담 권장";
      }
    }
    
    // 사유 발생일 기준 사유 (환입, 계약해제, 공급가액변동)
    if (today <= amendDeadline) {
      return "✅ 가산세 없음 (발급기한 이내)";
    } else if (today <= vatDeadline) {
      return "⚠️ 지연발급 가산세 1% (발급기한 경과)";
    } else {
      return "🚨 미발급 가산세 2% (신고기한 경과)";
    }
  }
  
  // 일반 세금계산서 발급인 경우
  if (today <= issueDeadline) {
    return "✅ 가산세 없음 (발급기한 이내)";
  } else if (today <= vatDeadline) {
    return "⚠️ 지연발급 가산세 1% 예상";
  } else {
    return "🚨 미발급 가산세 2% 예상";
  }
}

/**
 * 상세 가산세 정보 반환 (객체)
 */
export function getPenaltyDetails(
  transactionDate: ExtractedDate,
  issueDate: Date | null,
  today: Date = new Date()
): PenaltyResult {
  if (!transactionDate.year || !transactionDate.month) {
    return { type: "없음", rate: 0, message: "날짜 정보 부족" };
  }
  
  const issueDeadline = parseDeadlineToDate(getInvoiceIssuanceDeadline(transactionDate));
  const vatDeadline = parseDeadlineToDate(getVatFilingDeadline(transactionDate));
  
  // 아직 발급하지 않은 경우
  if (!issueDate) {
    if (today > vatDeadline) {
      return { 
        type: "미발급", 
        rate: 2.0, 
        message: "부가세 신고기한 경과로 미발급 가산세 2% 부과" 
      };
    } else if (today > issueDeadline) {
      return { 
        type: "지연발급", 
        rate: 1.0, 
        message: "발급기한 경과, 지금 발급하면 지연발급 가산세 1%" 
      };
    } else {
      return { 
        type: "없음", 
        rate: 0, 
        message: "발급기한 내 발급하면 가산세 없음" 
      };
    }
  }
  
  // 발급한 경우
  if (issueDate <= issueDeadline) {
    return { type: "없음", rate: 0, message: "정상 발급" };
  } else if (issueDate <= vatDeadline) {
    return { type: "지연발급", rate: 1.0, message: "지연발급 가산세 1% 부과" };
  } else {
    return { type: "미발급", rate: 2.0, message: "미발급 가산세 2% 부과" };
  }
}

/**
 * 오늘 날짜를 포맷팅합니다.
 */
export const getTodayFormatted = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  
  return `${year}년 ${month}월 ${day}일`;
};

/**
 * 답변 텍스트에서 동적 변수를 치환합니다.
 * 
 * @param text - 동적 변수가 포함된 답변 텍스트
 * @param extractedDate - 추출된 날짜 객체
 * @param amendmentReason - 수정 사유 (수정세금계산서인 경우)
 * @returns 치환된 답변 텍스트
 */
export const replaceDynamicVariables = (
  text: string,
  extractedDate?: ExtractedDate | null,
  amendmentReason?: AmendmentReason | null
): string => {
  let result = text;
  const today = new Date();
  
  // {today} 항상 치환
  result = result.replace(/{today}/g, getTodayFormatted());
  
  // 날짜가 추출된 경우에만 나머지 변수 치환
  if (extractedDate && extractedDate.year && extractedDate.month) {
    // {date}
    result = result.replace(/{date}/g, extractedDate.fullDate);
    
    // {vatDeadline} (기존 {deadline}도 호환성 유지)
    const vatDeadline = getVatFilingDeadline(extractedDate);
    result = result.replace(/{vatDeadline}/g, vatDeadline);
    result = result.replace(/{deadline}/g, vatDeadline);
    
    // {issueDeadline}
    const issueDeadline = getInvoiceIssuanceDeadline(extractedDate);
    result = result.replace(/{issueDeadline}/g, issueDeadline);
    
    // {transmitDeadline} - 발급일이 필요한데 현재는 거래일 기준으로 계산
    // 실제 발급일은 알 수 없으므로 거래일 기준으로 계산
    const supplyDate = extractedDateToDate(extractedDate);
    const transmitDeadline = getInvoiceTransmissionDeadline(supplyDate);
    result = result.replace(/{transmitDeadline}/g, transmitDeadline);
    
    // {amendmentDeadline} - 수정사유가 있을 때만
    if (amendmentReason) {
      const amendmentDeadline = getAmendmentDeadline(amendmentReason, extractedDate);
      result = result.replace(/{amendmentDeadline}/g, amendmentDeadline);
    }
    
    // {penaltyInfo} - 수정사유가 있을 때만 (더 정확한 판단)
    if (amendmentReason) {
      const penaltyInfo = getPenaltyInfo(extractedDate, amendmentReason, today);
      result = result.replace(/{penaltyInfo}/g, penaltyInfo);
    } else {
      // 일반 발급인 경우
      const penaltyInfo = getPenaltyInfo(extractedDate, null, today);
      result = result.replace(/{penaltyInfo}/g, penaltyInfo);
    }
  }
  
  return result;
};
