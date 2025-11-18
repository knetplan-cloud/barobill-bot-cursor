-- 공휴일 관리 테이블 생성
CREATE TABLE IF NOT EXISTS holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_year ON holidays(year);

-- RLS 활성화
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자가 조회 가능
CREATE POLICY "Anyone can view holidays"
  ON holidays FOR SELECT
  TO anon, authenticated
  USING (true);

-- 정책: 인증된 사용자만 추가/수정/삭제 가능
CREATE POLICY "Authenticated users can manage holidays"
  ON holidays FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2025년 기본 공휴일 데이터 삽입 (대체 공휴일 포함)
INSERT INTO holidays (date, name, year, is_custom) VALUES
  ('2025-01-01', '신정', 2025, false),
  ('2025-01-28', '설날', 2025, false),
  ('2025-01-29', '설날', 2025, false),
  ('2025-01-30', '설날 (대체공휴일)', 2025, false),
  ('2025-03-01', '삼일절', 2025, false),
  ('2025-05-05', '어린이날', 2025, false),
  ('2025-05-06', '부처님오신날', 2025, false),
  ('2025-06-06', '현충일', 2025, false),
  ('2025-08-15', '광복절', 2025, false),
  ('2025-10-03', '개천절', 2025, false),
  ('2025-10-06', '추석', 2025, false),
  ('2025-10-07', '추석', 2025, false),
  ('2025-10-08', '추석 (대체공휴일)', 2025, false),
  ('2025-10-09', '한글날', 2025, false),
  ('2025-12-25', '크리스마스', 2025, false),
  ('2026-01-01', '신정', 2026, false),
  ('2026-02-16', '설날 전날', 2026, false),
  ('2026-02-17', '설날', 2026, false),
  ('2026-02-18', '설날 다음날', 2026, false)
ON CONFLICT (date) DO NOTHING;

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_holidays_updated_at BEFORE UPDATE ON holidays
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 코멘트
COMMENT ON TABLE holidays IS '한국 법정 공휴일 및 사용자 지정 공휴일 관리';
COMMENT ON COLUMN holidays.date IS '공휴일 날짜';
COMMENT ON COLUMN holidays.name IS '공휴일 명칭';
COMMENT ON COLUMN holidays.year IS '연도';
COMMENT ON COLUMN holidays.is_custom IS '사용자 지정 공휴일 여부';

