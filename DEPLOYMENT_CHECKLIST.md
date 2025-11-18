# Vercel 배포 문제 해결 체크리스트

## 현재 상황
- ✅ Git 푸시 완료 (main 브랜치)
- ✅ 빌드 성공 (19초)
- ❌ FAQ가 Vercel에 반영되지 않음

## 확인 사항

### 1. Vercel 프로젝트 설정 확인
1. Vercel 대시보드 접속: https://vercel.com
2. 프로젝트 선택
3. **Settings → Git** 확인:
   - Production Branch가 `main`인지 확인
   - GitHub 저장소가 `knetplan-cloud/baro-bot-buddy`인지 확인

### 2. 최신 배포 확인
1. **Deployments** 탭에서 최신 배포 확인
2. 배포 상태가 "Ready"인지 확인
3. 배포된 커밋 해시가 `036db0e`인지 확인
   - 커밋 메시지: "feat: Add advanced tax date calculation and UI improvements"

### 3. 빌드 로그 확인
1. 최신 배포의 "Build Logs" 클릭
2. 다음 파일들이 빌드에 포함되었는지 확인:
   - `src/data/barobill-faq.json`
   - `src/pages/Index.tsx`
   - `src/components/FAQSection.tsx`

### 4. 환경 변수 확인
**Settings → Environment Variables**에서 다음 변수가 설정되어 있는지 확인:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 5. 브라우저 캐시 문제
1. 브라우저 하드 리프레시: `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac)
2. 또는 시크릿 모드에서 접속
3. 개발자 도구(F12) → Network 탭 → "Disable cache" 체크

### 6. 수동 재배포
위 사항을 확인한 후에도 문제가 있으면:
1. Vercel 대시보드 → **Deployments** 탭
2. 최신 배포의 "..." 메뉴 클릭
3. **Redeploy** 선택
4. "Use existing Build Cache" 체크 해제 (캐시 무시)
5. 재배포 실행

## 예상 원인 및 해결

### 원인 1: 잘못된 브랜치 배포
- **증상**: 빌드는 성공했지만 오래된 코드가 배포됨
- **해결**: Settings → Git → Production Branch를 `main`으로 설정

### 원인 2: 빌드 캐시 문제
- **증상**: 이전 빌드 결과가 재사용됨
- **해결**: Redeploy 시 "Use existing Build Cache" 체크 해제

### 원인 3: 환경 변수 누락
- **증상**: FAQ 데이터를 불러오지 못함
- **해결**: Environment Variables에 Supabase 정보 추가

### 원인 4: 브라우저 캐시
- **증상**: 로컬에서는 보이지만 배포 사이트에서는 안 보임
- **해결**: 하드 리프레시 또는 시크릿 모드

## 확인 명령어 (로컬)

```bash
# 현재 브랜치 확인
git branch

# 최신 커밋 확인
git log --oneline -1

# FAQ 파일 존재 확인
ls -la src/data/barobill-faq.json

# 빌드 테스트 (로컬)
npm run build
ls -la dist/assets/ | grep -i faq
```

## 다음 단계
위 체크리스트를 순서대로 확인하고, 문제가 지속되면 Vercel 지원팀에 문의하세요.

