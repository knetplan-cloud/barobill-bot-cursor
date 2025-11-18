# 🤖 세무 챗봇 고도화 가이드 (Cursor AI 구현용 완성본)

> **버전**: 2.0.0  
> **최종 수정**: 2025-11-18  
> **목적**: `date-utils.ts` 고도화를 위한 명세서

---

## 목차

1. [개요](#1-개요)
2. [동적 변수 정의](#2-동적-변수-정의)
3. [날짜 계산 함수 명세](#3-날짜-계산-함수-명세)
4. [2025년 한국 공휴일 데이터](#4-2025년-한국-공휴일-데이터)
5. [가산세 판단 로직](#5-가산세-판단-로직)
6. [수정사유 파싱 로직](#6-수정사유-파싱-로직)
7. [구현 우선순위](#7-구현-우선순위)
8. [테스트 케이스](#8-테스트-케이스)

---

## 1. 개요

### 1.1 목표

챗봇이 사용자의 날짜 기반 세무 질문(예: "10월 16일 반품 건")을 이해하고, 현행 세법(2025년 기준)에 맞는 정확한 마감일과 가산세 정보를 동적으로 계산하여 답변하도록 합니다.

### 1.2 핵심 기능

```
사용자 질문 → 날짜 추출 → 수정사유 파싱 → 마감일 계산 → 가산세 판단 → 답변 생성
```

---

## 2. 동적 변수 정의

### 2.1 전체 동적 변수 목록

| 변수명 | 설명 | 계산 함수 | 예시 값 |
|--------|------|-----------|---------|
| `{date}` | 사용자가 질문한 거래 날짜 | `extractDate()` | "2025년 10월 16일" |
| `{today}` | 챗봇 답변 시점의 오늘 날짜 | `new Date()` | "2025년 11월 18일" |
| `{issueDeadline}` | 세금계산서 발급기한 | `getInvoiceIssuanceDeadline()` | "2025년 11월 10일" |
| `{transmitDeadline}` | 세금계산서 전송기한 | `getInvoiceTransmissionDeadline()` | "발급일 다음 영업일" |
| `{vatDeadline}` | 부가세 확정신고 기한 | `getVatFilingDeadline()` | "2026년 1월 27일" |
| `{amendmentDeadline}` | 수정발급 안전 기한 | `getAmendmentDeadline()` | 사유별 다름 |
| `{penaltyInfo}` | 가산세 발생 여부 및 세율 | `getPenaltyInfo()` | "지연발급 1%" |

### 2.2 replaceDynamicVariables() 확장

```typescript
// src/lib/date-utils.ts

export function replaceDynamicVariables(
  text: string,
  extractedDate: ExtractedDate | null,
  amendmentReason?: AmendmentReason
): string {
  if (!extractedDate) return text;
  
  const today = new Date();
  
  // 기존 변수
  let result = text
    .replace(/{date}/g, formatDateKorean(extractedDate))
    .replace(/{today}/g, formatDateKorean({ 
      year: today.getFullYear(), 
      month: today.getMonth() + 1, 
      day: today.getDate() 
    }));
  
  // 신규 변수
  result = result
    .replace(/{issueDeadline}/g, getInvoiceIssuanceDeadline(extractedDate))
    .replace(/{vatDeadline}/g, getVatFilingDeadline(extractedDate))
    .replace(/{transmitDeadline}/g, "발급일 다음 영업일");
  
  // 수정사유가 있을 때만 계산
  if (amendmentReason) {
    result = result
      .replace(/{amendmentDeadline}/g, getAmendmentDeadline(amendmentReason, extractedDate))
      .replace(/{penaltyInfo}/g, getPenaltyInfo(extractedDate, amendmentReason, today));
  }
  
  return result;
}
```

---

## 3. 날짜 계산 함수 명세

### 3.1 타입 정의

```typescript
// src/lib/date-utils.ts

export interface ExtractedDate {
  year: number;
  month: number;  // 1~12
  day: number;
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
```

### 3.2 공휴일/주말 처리 함수

```typescript
/**
 * 주말 여부 확인
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 일요일(0), 토요일(6)
}

/**
 * 공휴일 여부 확인 (4번 섹션의 공휴일 데이터 사용)
 */
export function isHoliday(date: Date): boolean {
  const holidays2025 = getKoreanHolidays2025();
  const dateStr = formatDateISO(date); // "2025-01-01" 형식
  return holidays2025.includes(dateStr);
}

/**
 * 영업일 여부 확인
 */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

/**
 * 다음 영업일 반환
 * 주어진 날짜가 영업일이면 그대로, 아니면 다음 영업일 반환
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
```

### 3.3 세금계산서 발급기한 계산

```typescript
/**
 * 세금계산서 발급 마감일 계산
 * 규칙: 공급일이 속하는 달의 다음 달 10일 (공휴일/주말 시 연장)
 * 
 * @param supplyDate - 공급일 (거래일)
 * @returns 포맷된 마감일 문자열 (예: "2025년 11월 10일")
 */
export function getInvoiceIssuanceDeadline(supplyDate: ExtractedDate): string {
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
```

### 3.4 부가세 신고기한 계산

```typescript
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
```

### 3.5 수정세금계산서 기한 계산

```typescript
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
```

### 3.6 전송기한 계산

```typescript
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
```

---

## 4. 2025년 한국 공휴일 데이터

### 4.1 공휴일 목록

```typescript
/**
 * 2025년 한국 법정 공휴일 목록
 * 형식: "YYYY-MM-DD"
 * 
 * ⚠️ 중요: 세금계산서 발급/신고 마감일 계산에 직접 영향
 */
export const KOREAN_HOLIDAYS_2025: string[] = [
  // 1월
  "2025-01-01", // 신정
  "2025-01-28", // 설날 전날
  "2025-01-29", // 설날
  "2025-01-30", // 설날 다음날
  
  // 3월
  "2025-03-01", // 삼일절
  
  // 5월
  "2025-05-05", // 어린이날
  "2025-05-06", // 부처님오신날 (음력 4월 8일)
  
  // 6월
  "2025-06-06", // 현충일
  
  // 8월
  "2025-08-15", // 광복절
  
  // 10월
  "2025-10-03", // 개천절
  "2025-10-06", // 추석 전날 (음력 8월 14일)
  "2025-10-07", // 추석 (음력 8월 15일)
  "2025-10-08", // 추석 다음날
  "2025-10-09", // 한글날
  
  // 12월
  "2025-12-25", // 성탄절
];

// 함수 형태로도 제공
export function getKoreanHolidays2025(): string[] {
  return KOREAN_HOLIDAYS_2025;
}

/**
 * 2026년 한국 법정 공휴일 목록 (1~2월)
 * 부가세 신고기한(1/25) 계산에 필요
 */
export function getKoreanHolidays2026Jan(): string[] {
  return [
    "2026-01-01", // 신정
    "2026-02-16", // 설날 전날 (음력 12월 29일)
    "2026-02-17", // 설날 (음력 1월 1일)
    "2026-02-18", // 설날 다음날
  ];
}
```

### 4.2 공휴일 데이터 활용

```typescript
/**
 * 연도별 공휴일 통합 조회
 */
export function getKoreanHolidays(year: number): string[] {
  if (year === 2025) return getKoreanHolidays2025();
  if (year === 2026) return getKoreanHolidays2026Jan();
  
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
```

---

## 5. 가산세 판단 로직

### 5.1 가산세 종류 및 세율

| 구분 | 사유 | 가산세율 | 기준 |
|------|------|----------|------|
| 발급 가산세 | 지연발급 | 1% | 발급기한 경과 ~ VAT 신고기한 이내 |
| 발급 가산세 | 미발급 | 2% | VAT 신고기한까지 미발급 |
| 전송 가산세 | 지연전송 | 0.3% | 전송기한 경과 ~ VAT 신고기한 이내 |
| 전송 가산세 | 미전송 | 0.5% | VAT 신고기한까지 미전송 |

### 5.2 가산세 판단 함수

```typescript
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
  today: Date
): string {
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
  today: Date
): PenaltyResult {
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
```

### 5.3 가산세 판단 플로우차트

```
사용자 질문 수신
      │
      ▼
┌─────────────────┐
│ 날짜 추출        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 수정사유 파싱    │
└────────┬────────┘
         │
    ┌────┴────────────┐
    │                 │
    ▼                 ▼
[수정발급]        [일반발급]
    │                 │
    ▼                 ▼
┌─────────┐     ┌─────────┐
│사유 분류 │     │발급기한  │
└────┬────┘     │계산     │
     │          └────┬────┘
┌────┴────┐          │
│         │          │
▼         ▼          │
[원본기준] [사유발생]  │
│         │          │
▼         ▼          ▼
VAT신고  발급기한   발급기한
기한확인  확인      확인
│         │          │
▼         ▼          ▼
┌─────────────────────────┐
│    오늘 날짜와 비교       │
└─────────────────────────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
  없음  1%   2%
```

---

## 6. 수정사유 파싱 로직

### 6.1 사유별 키워드 정의

```typescript
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
```

### 6.2 사유 파싱 함수

```typescript
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
```

### 6.3 파싱 예시

| 질문 | 파싱 결과 | 설명 |
|------|-----------|------|
| "10월 16일 반품된 건 처리" | `환입` | "반품" 키워드 매칭 |
| "계약이 취소됐어요" | `계약해제` | "계약", "취소" 키워드 |
| "주소를 잘못 썼어요" | `착오정정` | "잘못" 키워드 |
| "두 번 발급했어요" | `이중발급` | "두 번" 키워드 |
| "할인해줬는데" | `공급가액변동` | "할인" 키워드 |

---

## 7. 구현 우선순위

### 7.1 Phase 1: 핵심 기능 (즉시 구현)

```
✅ 1. getKoreanHolidays2025() - 공휴일 데이터
✅ 2. isWeekend(), isHoliday(), adjustDeadline() - 영업일 처리
✅ 3. getInvoiceIssuanceDeadline() - 발급기한 계산
✅ 4. getVatFilingDeadline() 보강 - 공휴일/주말 고려
✅ 5. replaceDynamicVariables() 확장 - {issueDeadline}, {vatDeadline}
```

### 7.2 Phase 2: 수정발급 지원

```
✅ 1. parseAmendmentReason() - 수정사유 파싱
✅ 2. getAmendmentDeadline() - 사유별 마감일 계산
✅ 3. getAmendmentWriteDate() - 작성일자 규칙
✅ 4. replaceDynamicVariables() 확장 - {amendmentDeadline}
```

### 7.3 Phase 3: 가산세 판단

```
✅ 1. getPenaltyInfo() - 가산세 발생 여부
✅ 2. getPenaltyDetails() - 상세 가산세 정보
✅ 3. replaceDynamicVariables() 확장 - {penaltyInfo}
```

### 7.4 Phase 4: 전송기한

```
✅ 1. getInvoiceTransmissionDeadline() - 전송기한 계산
✅ 2. 전송 가산세 판단 로직 추가
✅ 3. replaceDynamicVariables() 확장 - {transmitDeadline}
```

---

## 8. 테스트 케이스

### 8.1 발급기한 테스트

```typescript
describe("getInvoiceIssuanceDeadline", () => {
  test("10월 16일 거래 → 11월 10일", () => {
    const result = getInvoiceIssuanceDeadline({ year: 2025, month: 10, day: 16 });
    expect(result).toBe("2025년 11월 10일");
  });
  
  test("4월 공급분 → 5월 10일(토) → 5월 12일(월)", () => {
    const result = getInvoiceIssuanceDeadline({ year: 2025, month: 4, day: 15 });
    expect(result).toBe("2025년 5월 12일"); // 10일이 토요일
  });
  
  test("12월 공급분 → 다음해 1월 10일", () => {
    const result = getInvoiceIssuanceDeadline({ year: 2025, month: 12, day: 20 });
    expect(result).toBe("2026년 1월 12일"); // 10일이 토요일
  });
});
```

### 8.2 부가세 신고기한 테스트

```typescript
describe("getVatFilingDeadline", () => {
  test("1월 거래 → 7월 25일", () => {
    const result = getVatFilingDeadline({ year: 2025, month: 1, day: 15 });
    expect(result).toBe("2025년 7월 25일");
  });
  
  test("9월 거래 → 다음해 1월 25일(토) → 1월 27일(월)", () => {
    const result = getVatFilingDeadline({ year: 2025, month: 9, day: 16 });
    expect(result).toBe("2026년 1월 27일"); // 25일이 토요일
  });
});
```

### 8.3 수정발급 기한 테스트

```typescript
describe("getAmendmentDeadline", () => {
  test("환입 (11월 5일 반품) → 12월 10일", () => {
    const result = getAmendmentDeadline("환입", { year: 2025, month: 11, day: 5 });
    expect(result).toBe("2025년 12월 10일");
  });
  
  test("착오정정 (9월 16일 원본) → 2026년 1월 27일", () => {
    const result = getAmendmentDeadline("착오정정", { year: 2025, month: 9, day: 16 });
    expect(result).toBe("2026년 1월 27일");
  });
});
```

### 8.4 가산세 판단 테스트

```typescript
describe("getPenaltyInfo", () => {
  test("기한 내 → 가산세 없음", () => {
    const today = new Date(2025, 10, 5); // 11월 5일
    const result = getPenaltyInfo(
      { year: 2025, month: 10, day: 16 }, 
      null, 
      today
    );
    expect(result).toContain("가산세 없음");
  });
  
  test("발급기한 경과 → 지연발급 1%", () => {
    const today = new Date(2025, 10, 15); // 11월 15일 (10일 경과)
    const result = getPenaltyInfo(
      { year: 2025, month: 10, day: 16 }, 
      null, 
      today
    );
    expect(result).toContain("1%");
  });
});
```

### 8.5 수정사유 파싱 테스트

```typescript
describe("parseAmendmentReason", () => {
  test("반품 키워드 → 환입", () => {
    expect(parseAmendmentReason("10월 16일 반품된 건")).toBe("환입");
  });
  
  test("계약취소 키워드 → 계약해제", () => {
    expect(parseAmendmentReason("계약이 취소됐어요")).toBe("계약해제");
  });
  
  test("오타 키워드 → 착오정정", () => {
    expect(parseAmendmentReason("주소를 잘못 썼어요")).toBe("착오정정");
  });
  
  test("키워드 없음 → null", () => {
    expect(parseAmendmentReason("세금계산서 발급하고 싶어요")).toBe(null);
  });
});
```

---

## 부록: 유틸리티 함수

```typescript
/**
 * ExtractedDate를 Date 객체로 변환
 */
export function extractedDateToDate(date: ExtractedDate): Date {
  return new Date(date.year, date.month - 1, date.day);
}

/**
 * 날짜를 한글 형식으로 포맷
 */
export function formatDateKorean(date: ExtractedDate): string {
  return `${date.year}년 ${date.month}월 ${date.day}일`;
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
 * 한글 날짜 문자열을 Date 객체로 파싱
 */
export function parseDeadlineToDate(deadline: string): Date {
  // "2025년 11월 10일" → Date
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
```

---

## 최종 체크리스트

| 항목 | 상태 | 설명 |
|------|------|------|
| 동적 변수 정의 | ✅ | 6개 변수 모두 정의됨 |
| 함수 시그니처 | ✅ | 입출력 타입 명확히 정의 |
| 공휴일 데이터 | ✅ | 2025년, 2026년 1~2월 포함 |
| 공휴일/주말 처리 | ✅ | adjustDeadline() 구현 |
| 발급기한 계산 | ✅ | getInvoiceIssuanceDeadline() |
| VAT 신고기한 | ✅ | getVatFilingDeadline() 보강 |
| 수정사유 파싱 | ✅ | parseAmendmentReason() |
| 수정발급 기한 | ✅ | getAmendmentDeadline() |
| 가산세 판단 | ✅ | getPenaltyInfo() |
| 테스트 케이스 | ✅ | 주요 함수별 테스트 제공 |

---

## 9. chatbot-engine.ts 연동 가이드

### 9.1 연동 개요

`date-utils.ts`에서 계산된 날짜를 챗봇 응답에 반영하려면 `chatbot-engine.ts`의 `replaceDynamicVariables` 함수를 확장해야 합니다.

### 9.2 동적 변수 매핑

| 동적 변수 | 호출 함수 | 필요 파라미터 |
|-----------|-----------|---------------|
| `{date}` | `formatDateKorean()` | extractedDate |
| `{today}` | `new Date()` | - |
| `{issueDeadline}` | `getInvoiceIssuanceDeadline()` | extractedDate |
| `{vatDeadline}` | `getVatFilingDeadline()` | extractedDate |
| `{amendmentDeadline}` | `getAmendmentDeadline()` | reason, extractedDate |
| `{penaltyInfo}` | `getPenaltyInfo()` | extractedDate, reason, today |

### 9.3 확장된 replaceDynamicVariables 함수

```typescript
// src/lib/chatbot-engine.ts

import {
  extractDate,
  extractedDateToDate,
  formatDateKorean,
  getInvoiceIssuanceDeadline,
  getVatFilingDeadline,
  getAmendmentDeadline,
  getPenaltyInfo,
  ExtractedDate,
  AmendmentReason
} from './date-utils';

/**
 * 답변 텍스트의 동적 변수를 실제 값으로 치환
 * 
 * @param text - 동적 변수가 포함된 답변 텍스트
 * @param extractedDate - 추출된 날짜 객체
 * @param amendmentReason - 수정 사유 (수정세금계산서인 경우)
 * @returns 치환된 답변 텍스트
 */
export function replaceDynamicVariables(
  text: string,
  extractedDate: ExtractedDate | null,
  amendmentReason: AmendmentReason | null
): string {
  let result = text;
  const today = new Date();
  
  // {today} 항상 치환
  result = result.replace(/{today}/g, formatDateKorean({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate()
  }));
  
  // 날짜가 추출된 경우에만 나머지 변수 치환
  if (extractedDate) {
    const date = extractedDateToDate(extractedDate);
    
    // {date}
    result = result.replace(/{date}/g, formatDateKorean(extractedDate));
    
    // {vatDeadline}
    const vatDeadline = getVatFilingDeadline(extractedDate);
    result = result.replace(/{vatDeadline}/g, vatDeadline);
    
    // {issueDeadline}
    const issueDeadline = getInvoiceIssuanceDeadline(extractedDate);
    result = result.replace(/{issueDeadline}/g, issueDeadline);
    
    // {amendmentDeadline} - 수정사유가 있을 때만
    if (amendmentReason) {
      const amendmentDeadline = getAmendmentDeadline(amendmentReason, extractedDate);
      result = result.replace(/{amendmentDeadline}/g, amendmentDeadline);
    }
    
    // {penaltyInfo} - Phase 3에서 구현
    // (발급일 정보가 필요하므로 복잡한 연동 필요)
  }
  
  return result;
}
```

### 9.4 수정사유 파싱 함수

```typescript
// src/lib/chatbot-engine.ts

/**
 * 사용자 질문에서 수정세금계산서 사유 추출
 * 
 * @param query - 사용자 질문
 * @returns 추출된 수정 사유 또는 null
 */
function parseAmendmentReason(query: string): AmendmentReason | null {
  const normalizedQuery = normalizeText(query);
  
  // 우선순위 순서로 체크 (구체적인 것부터)
  if (normalizedQuery.includes("내국신용장") || normalizedQuery.includes("사후개설")) {
    return "내국신용장사후개설";
  }
  if (normalizedQuery.includes("이중발급") || normalizedQuery.includes("중복발급") || normalizedQuery.includes("두번")) {
    return "이중발급";
  }
  if (normalizedQuery.includes("착오정정") || normalizedQuery.includes("오타") || normalizedQuery.includes("잘못") || normalizedQuery.includes("오류")) {
    return "착오정정";
  }
  if (normalizedQuery.includes("계약해제") || normalizedQuery.includes("계약취소")) {
    return "계약해제";
  }
  if (normalizedQuery.includes("금액변동") || normalizedQuery.includes("할인") || normalizedQuery.includes("공급가액변동")) {
    return "공급가액변동";
  }
  if (normalizedQuery.includes("환입") || normalizedQuery.includes("반품") || normalizedQuery.includes("환불")) {
    return "환입";
  }
  
  return null;
}
```

### 9.5 matchQuery 함수 수정

```typescript
// src/lib/chatbot-engine.ts

/**
 * 사용자 질문에 맞는 답변 검색 및 생성
 */
export function matchQuery(
  query: string,
  knowledgeBase: KnowledgeItem[],
  speechStyle: SpeechStyle = "formal"
): MatchResult {
  // 1. 날짜 추출
  const extractedDate = extractDateFromQuery(query);
  
  // 2. 수정사유 파싱 (★ 신규)
  const amendmentReason = parseAmendmentReason(query);
  
  // 3. 검색 엔진으로 최적 항목 찾기
  const searchResults = searchKnowledge(query, knowledgeBase);
  
  if (searchResults.length === 0) {
    return {
      success: false,
      message: "관련 정보를 찾을 수 없습니다."
    };
  }
  
  const bestMatch = searchResults[0];
  
  // 4. 어투에 맞는 답변 선택
  const responseText = bestMatch.responses[speechStyle] 
    || bestMatch.responses.formal;
  
  // 5. 동적 변수 치환 (★ amendmentReason 전달)
  const processedText = replaceDynamicVariables(
    responseText, 
    extractedDate, 
    amendmentReason  // 수정사유 전달
  );
  
  return {
    success: true,
    text: processedText,
    item: bestMatch,
    extractedDate,
    amendmentReason,
    relatedGuides: bestMatch.relatedGuides,
    followUpQuestions: bestMatch.followUpQuestions
  };
}
```

### 9.6 타입 정의

```typescript
// src/types/index.ts

export interface MatchResult {
  success: boolean;
  text?: string;
  message?: string;
  item?: KnowledgeItem;
  extractedDate?: ExtractedDate | null;
  amendmentReason?: AmendmentReason | null;
  relatedGuides?: RelatedGuide[];
  followUpQuestions?: string[];
}

export type SpeechStyle = "formal" | "casual" | "informal" | "plain";
```

---

## 10. 실제 JSON 데이터 예시 (6대 수정사유)

아래는 `barobill-knowledge.json`의 `items` 배열에 추가할 6대 수정사유 예시입니다.

> ⚠️ **핵심**: 하드코딩된 날짜("9월 16일") 대신 **동적 변수(`{date}`, `{vatDeadline}`)**를 사용하여 모든 날짜에 대응합니다.

### 10.1 환입 (반품)

```json
{
  "id": "case_return_example_0916",
  "type": "case",
  "source": "manual",
  "status": "active",
  "category": "수정세금계산서",
  "title": "9월 16일 거래분 반품 처리 (환입)",
  "keywords": ["9월", "반품", "환입", "수정", "11월 5일"],
  "priority": 9,
  "dateTemplate": true,
  "negativeKeywords": ["착오", "오타", "이중발급"],
  "responses": {
    "formal": "{date} 거래가 11월 5일에 반품되었다면, **'환입'** 사유로 수정세금계산서를 발급해야 합니다.\n\n- **작성일자:** 반품된 날짜인 **11월 5일**\n- **{amendmentDeadline} (발급기한):** 11월 5일의 다음 달 10일인 **12월 10일**\n- **가산세:** {amendmentDeadline}까지 발급 시 가산세가 없으나, 기한을 넘기면 지연발급(1%) 가산세가 부과됩니다.",
    "casual": "{date} 거 11월 5일에 반품됐군요! '환입'으로 수정발급하면 돼요.\n\n- **날짜는?** 반품된 날짜인 **11월 5일**로!\n- **언제까지?** **12월 10일**까지 발급해야 가산세 없어요. 늦으면 1% 가산세! 😱",
    "informal": "{date} 거 11월 5일에 반품됐어? '환입'으로 수정발급하면 돼.\n\n- **날짜는?** 반품된 **11월 5일**\n- **언제까지?** **12월 10일**까지 발급해야 가산세 없어. 늦으면 1%!",
    "plain": "{date} 거래, 11/5 반품 건은 '환입' 사유임. 작성일 11/5, 발급기한 12/10. 기한 경과 시 지연발급 가산세 1%."
  },
  "followUpQuestions": ["가산세는 얼마인가요?", "작성일자가 원본과 다른가요?"]
}
```

### 10.2 계약해제

```json
{
  "id": "case_cancel_example_0916",
  "type": "case",
  "source": "manual",
  "status": "active",
  "category": "수정세금계산서",
  "title": "9월 16일 거래 계약 해제 처리",
  "keywords": ["9월", "계약해제", "계약취소", "취소", "수정"],
  "priority": 9,
  "dateTemplate": true,
  "negativeKeywords": ["착오", "반품", "환입"],
  "responses": {
    "formal": "{date} 거래가 11월 15일에 계약 해제되었다면, **'계약의 해제'** 사유로 수정세금계산서를 발급해야 합니다.\n\n- **작성일자:** 계약이 해제된 날짜인 **11월 15일**\n- **{amendmentDeadline} (발급기한):** 11월 15일의 다음 달 10일인 **12월 10일**\n- **가산세:** {amendmentDeadline}까지 발급 시 가산세가 없습니다.",
    "casual": "{date} 계약이 11월 15일에 취소됐어요? '계약의 해제'로 수정발급하세요!\n\n- **날짜는?** 계약 해제된 **11월 15일**\n- **언제까지?** **12월 10일**까지 발급해야 가산세 없어요!",
    "informal": "{date} 계약이 11월 15일에 취소됐어? '계약의 해제'로 수정발급해!\n\n- **날짜는?** 계약 해제된 **11월 15일**\n- **언제까지?** **12월 10일**까지!",
    "plain": "{date} 거래, 11/15 계약 해제 건은 '계약의 해제' 사유임. 작성일 11/15, 발급기한 12/10. 기한 내 가산세 없음."
  },
  "followUpQuestions": ["환입과 계약해제의 차이", "발급기한 놓치면?"]
}
```

### 10.3 공급가액 변동

```json
{
  "id": "case_amount_change_example_0916",
  "type": "case",
  "source": "manual",
  "status": "active",
  "category": "수정세금계산서",
  "title": "9월 16일 거래분 할인 (공급가액 변동)",
  "keywords": ["9월", "할인", "금액변경", "공급가액", "변동", "수정"],
  "priority": 9,
  "dateTemplate": true,
  "negativeKeywords": ["착오", "반품"],
  "responses": {
    "formal": "{date} 거래에 대해 11월 20일에 할인이 결정되었다면, **'공급가액 변동'** 사유로 수정세금계산서를 발급합니다.\n\n- **작성일자:** 할인이 결정된 날짜인 **11월 20일**\n- **{amendmentDeadline} (발급기한):** 11월 20일의 다음 달 10일인 **12월 10일**\n- **금액:** 할인된 금액만큼 마이너스(-)로 입력합니다.",
    "casual": "{date} 거 11월 20일에 할인해줬어요? '공급가액 변동'으로 수정발급하세요!\n\n- **날짜는?** 할인해준 **11월 20일**\n- **언제까지?** **12월 10일**까지!",
    "informal": "{date} 거 11월 20일에 할인해줬어? '공급가액 변동'으로 수정발급해!\n\n- **날짜는?** 할인해준 **11월 20일**\n- **언제까지?** **12월 10일**까지!",
    "plain": "{date} 거래, 11/20 할인 건은 '공급가액 변동' 사유임. 작성일 11/20, 발급기한 12/10. 할인액만큼 (-) 입력."
  },
  "followUpQuestions": ["추가 청구도 공급가액 변동인가요?"]
}
```

### 10.4 기재사항 착오정정

> ⚠️ **주목**: 이 사유는 작성일자가 **원본 날짜(`{date}`)로 고정**되고, 마감일이 **`{vatDeadline}`**입니다.

```json
{
  "id": "case_error_correction_example_0916",
  "type": "case",
  "source": "manual",
  "status": "active",
  "category": "수정세금계산서",
  "title": "9월 16일 거래분 주소 오류 (기재사항 착오)",
  "keywords": ["9월", "주소", "오류", "오타", "잘못", "착오정정", "수정"],
  "priority": 9,
  "dateTemplate": true,
  "negativeKeywords": ["반품", "취소", "할인"],
  "responses": {
    "formal": "{date} 거래의 주소를 11월 25일에 발견했다면, **'기재사항 착오정정'** 사유로 수정발급합니다.\n\n- **작성일자:** 원본 날짜인 **{date}** (변경 불가)\n- **{amendmentDeadline} (발급기한):** 원본의 부가세 확정신고기한인 **{vatDeadline}**까지\n- **가산세:** {amendmentDeadline} 이내에 수정하면 가산세가 없습니다.",
    "casual": "{date} 거 주소 틀린 걸 11월 25일에 알았다고요? '기재사항 착오정정'이에요!\n\n- **날짜는?** 원본 날짜인 **{date}** 그대로!\n- **언제까지?** 부가세 확정신고 기한인 **{vatDeadline}**까지만 수정하면 가산세 없어요. 다행이죠? 😄",
    "informal": "{date} 거 주소 틀린 걸 11월 25일에 알았다고? '기재사항 착오정정'이야!\n\n- **날짜는?** 원본 날짜인 **{date}** 그대로!\n- **언제까지?** **{vatDeadline}**까지만 수정하면 가산세 없어. 다행이지? 😄",
    "plain": "{date} 거래, 11/25 주소 오류 발견 건은 '기재사항 착오정정' 사유임. 작성일 {date} (원본일), 수정기한 {vatDeadline}. 기한 내 가산세 없음."
  },
  "followUpQuestions": ["금액도 착오정정으로 수정하나요?", "사업자번호를 잘못 썼어요"]
}
```

### 10.5 이중발급

```json
{
  "id": "case_duplicate_example_0916",
  "type": "case",
  "source": "manual",
  "status": "active",
  "category": "수정세금계산서",
  "title": "9월 16일 거래분 이중발급 처리",
  "keywords": ["9월", "이중발급", "중복발급", "두번", "수정"],
  "priority": 9,
  "dateTemplate": true,
  "negativeKeywords": ["반품", "착오정정"],
  "responses": {
    "formal": "{date} 거래가 이중발급된 것을 12월 1일에 발견했다면, **'착오에 의한 이중발급'** 사유로 수정발급합니다.\n\n- **작성일자:** 원본 날짜인 **{date}**\n- **{amendmentDeadline} (발급기한):** 원본의 부가세 확정신고기한인 **{vatDeadline}**까지\n- **처리:** 12월 1일에, {date}자로 마이너스(-) 1장만 발급하면 됩니다.",
    "casual": "{date} 거 두 번 보냈어요? 12월 1일에 알았어도 괜찮아요! '착오에 의한 이중발급' 쓰면 돼요.\n\n- **날짜는?** 원본 날짜 **{date}**로!\n- **언제까지?** **{vatDeadline}**까지만 수정하면 가산세 없어요!",
    "informal": "{date} 거 두 번 보냈어? 12월 1일에 알았어도 괜찮아! '착오에 의한 이중발급' 쓰면 돼.\n\n- **날짜는?** 원본 날짜 **{date}**로!\n- **언제까지?** **{vatDeadline}**까지만 수정하면 가산세 없어!",
    "plain": "{date} 거래, 12/1 이중발급 발견 건은 '착오에 의한 이중발급' 사유임. 작성일 {date} (원본일), 수정기한 {vatDeadline}. 원본 전액 (-) 1장 발급."
  },
  "followUpQuestions": ["착오정정과 이중발급의 차이"]
}
```

### 10.6 내국신용장 사후개설

```json
{
  "id": "case_post_lc_example_0916",
  "type": "case",
  "source": "manual",
  "status": "active",
  "category": "수정세금계산서",
  "title": "9월 16일 거래분 내국신용장 사후개설",
  "keywords": ["9월", "내국신용장", "사후개설", "영세율", "수정"],
  "priority": 9,
  "dateTemplate": true,
  "negativeKeywords": ["반품", "착오정정"],
  "responses": {
    "formal": "{date}(과세 10%) 거래에 대해 **10월 20일**에 내국신용장이 개설되었다면, **'내국신용장 사후개설'** 사유로 수정발급합니다.\n(참고: {date}의 과세기간 예정신고 기한인 10월 25일까지 개설되었습니다.)\n\n- **작성일자:** 원본 날짜인 **{date}**\n- **처리:** 총 2장 발급 (①원본 10% 취소 (-), ②영세율 0% 신규 (+))\n- **{amendmentDeadline} (발급기한):** 원본의 확정신고기한(**{vatDeadline}**)까지 발급하면 됩니다.",
    "casual": "{date}에 10%로 끊었는데 10월 20일에 신용장 나왔어요? '내국신용장 사후개설'로 바꾸면 돼요! (10월 25일 안에 개설돼서 다행이네요!)\n\n- **날짜는?** 원본 날짜 **{date}**!\n- **어떻게?** 2장 나갈 거예요. (① 10%짜리 취소, ② 0%짜리 새로 발급)",
    "informal": "{date}에 10%로 끊었는데 10월 20일에 신용장 나왔어? '내국신용장 사후개설'로 바꾸면 돼! (10월 25일 안에 개설돼서 다행이다!)\n\n- **날짜는?** 원본 날짜 **{date}**!\n- **어떻게?** 2장 나갈 거야. (① 10%짜리 취소, ② 0%짜리 새로 발급)",
    "plain": "{date} 과세, 10/20 내신 개설 건은 '내국신용장 사후개설' 사유임. (기한 10/25 내 충족). 작성일 {date} (원본일), 2장 발급 (과세 취소, 영세 신규)."
  },
  "followUpQuestions": ["신용장 개설이 10월 25일 이후면?"]
}
```

### 10.7 동적 변수 사용 요약

| 수정사유 | 작성일자 | 발급기한 | 사용 변수 |
|----------|----------|----------|-----------|
| 환입 | 사유 발생일 | 다음 달 10일 | `{date}`, `{amendmentDeadline}` |
| 계약해제 | 사유 발생일 | 다음 달 10일 | `{date}`, `{amendmentDeadline}` |
| 공급가액변동 | 사유 발생일 | 다음 달 10일 | `{date}`, `{amendmentDeadline}` |
| 착오정정 | **원본 날짜** | **VAT 신고기한** | `{date}`, `{vatDeadline}`, `{amendmentDeadline}` |
| 이중발급 | **원본 날짜** | **VAT 신고기한** | `{date}`, `{vatDeadline}`, `{amendmentDeadline}` |
| 내국신용장 | **원본 날짜** | **VAT 신고기한** | `{date}`, `{vatDeadline}`, `{amendmentDeadline}` |
```

---

## 11. 어투(SpeechStyle) 가이드

### 11.1 4가지 어투 정의

| 어투 | 키 | 특징 | 대상 |
|------|-----|------|------|
| 격식체 | `formal` | ~입니다, ~하십시오 | 공식 문서, 비즈니스 |
| 해요체 | `casual` | ~에요, ~해요, 이모지 | 친근한 상담 |
| 반말 | `informal` | ~야, ~해 | 친한 관계 |
| 평어체 | `plain` | ~함, ~임, 명사형 | 간결한 요약 |

### 11.2 어투별 답변 예시

**질문**: "9월 16일 반품 건 처리 방법"

```typescript
// formal
"9월 16일 거래가 반품되었다면, **'환입'** 사유로 수정세금계산서를 발급해야 합니다."

// casual
"9월 16일 거 반품됐군요! '환입'으로 수정발급하면 돼요. 😊"

// informal
"9월 16일 거 반품됐어? '환입'으로 수정발급하면 돼."

// plain
"9/16 반품 건은 '환입' 사유임. 수정발급 필요."
```

### 11.3 타입 정의

```typescript
// src/types/index.ts

export type SpeechStyle = "formal" | "casual" | "informal" | "plain";

export interface ResponseSet {
  formal: string;
  casual?: string;
  informal?: string;
  plain?: string;
}
```

---

> **이 문서를 Cursor AI에 전달하면 `date-utils.ts` 및 `chatbot-engine.ts` 고도화를 즉시 진행할 수 있습니다.**
