#!/usr/bin/env python3
"""
바로빌 챗봇 데이터 변환기
Excel → JSON 자동 변환 스크립트

사용법:
    python excel_to_json_converter.py --input 데이터.xlsx --output result.json
    python excel_to_json_converter.py -i 데이터.xlsx -o result.json --validate
"""

import pandas as pd
import json
import argparse
from datetime import datetime
from typing import Dict, List, Any
import sys
import re


class ChatbotDataConverter:
    """엑셀 데이터를 JSON으로 변환하는 클래스"""
    
    def __init__(self, excel_file: str):
        self.excel_file = excel_file
        self.data = {
            "metadata": {},
            "synonyms": {},
            "items": []
        }
        self.faq_data = None
        
    def load_excel(self) -> Dict[str, pd.DataFrame]:
        """엑셀 파일의 모든 시트 로드"""
        try:
            xl_file = pd.ExcelFile(self.excel_file)
            sheets = {}
            
            for sheet_name in xl_file.sheet_names:
                sheets[sheet_name] = pd.read_excel(self.excel_file, sheet_name=sheet_name)
                print(f"✓ 시트 로드: {sheet_name} ({len(sheets[sheet_name])}행)")
            
            return sheets
        except Exception as e:
            print(f"❌ 엑셀 파일 로드 실패: {e}")
            sys.exit(1)
    
    def convert_main_data(self, df: pd.DataFrame) -> List[Dict]:
        """메인 데이터 시트를 JSON items로 변환"""
        items = []
        
        for idx, row in df.iterrows():
            # 빈 행 스킵
            if pd.isna(row.get('ID')) or pd.isna(row.get('질문')):
                continue
            
            item = {
                "id": str(row['ID']).strip(),
                "type": self._map_type(row.get('구분', '')),
                "category": str(row.get('대분류', '')).strip(),
                "title": str(row['질문']).strip(),
                "keywords": self._parse_keywords(row.get('키워드', '')),
                "priority": int(row.get('우선순위', 5))
            }
            
            # 설명 (선택)
            if pd.notna(row.get('설명')) and str(row.get('설명')).strip() != '-':
                item["description"] = str(row['설명']).strip()
            
            # 제외 키워드 (선택)
            if pd.notna(row.get('제외키워드')) and str(row.get('제외키워드')).strip() != '-':
                item["negativeKeywords"] = self._parse_keywords(row.get('제외키워드', ''))
            
            # 날짜 템플릿 (선택)
            date_template = str(row.get('날짜템플릿', '')).strip().upper()
            if date_template in ['Y', 'YES', 'TRUE', '1', '예', 'O']:
                item["dateTemplate"] = True
            
            # 어투별 답변
            responses = {}
            if pd.notna(row.get('격식체답변')):
                responses["formal"] = str(row['격식체답변']).strip()
            if pd.notna(row.get('해요체답변')):
                responses["casual"] = str(row['해요체답변']).strip()
            if pd.notna(row.get('평어체답변')):
                responses["plain"] = str(row['평어체답변']).strip()
            
            if responses:
                item["responses"] = responses
            else:
                print(f"⚠️  경고: [{item['id']}] 답변이 없습니다.")
            
            # 관련 가이드 (선택)
            if pd.notna(row.get('관련가이드URL')) and str(row.get('관련가이드URL')).strip() != '-':
                item["relatedGuides"] = self._parse_guides(row.get('관련가이드URL', ''))
            
            # 관련 질문 목록 (선택)
            if pd.notna(row.get('관련 질문 목록')) and str(row.get('관련 질문 목록')).strip() != '-':
                item["relatedQuestions"] = self._parse_keywords(row.get('관련 질문 목록', ''))
            
            # 추천 후속 질문 (선택)
            if pd.notna(row.get('추천 후속 질문')) and str(row.get('추천 후속 질문')).strip() != '-':
                item["followUpQuestions"] = self._parse_keywords(row.get('추천 후속 질문', ''))
            
            items.append(item)
            print(f"✓ 변환 완료: {item['id']} - {item['title'][:30]}...")
        
        return items
    
    def convert_synonyms(self, df: pd.DataFrame) -> Dict[str, List[str]]:
        """동의어 사전 시트를 JSON synonyms로 변환"""
        synonyms = {}
        
        for idx, row in df.iterrows():
            if pd.isna(row.get('대표어')):
                continue
            
            main_word = str(row['대표어']).strip()
            synonym_list = []
            
            # 동의어1~5 컬럼에서 추출
            for col_num in range(1, 6):
                col_name = f'동의어{col_num}'
                if col_name in row and pd.notna(row[col_name]):
                    synonym = str(row[col_name]).strip()
                    if synonym != '-' and synonym:
                        synonym_list.append(synonym)
            
            if synonym_list:
                synonyms[main_word] = synonym_list
                print(f"✓ 동의어 등록: {main_word} → {len(synonym_list)}개")
        
        return synonyms
    
    def convert_faq_data(self, df: pd.DataFrame) -> Dict:
        """FAQ 시트를 JSON으로 변환"""
        faq_data = {
            "metadata": {
                "version": "1.0.0",
                "updated_at": datetime.now().strftime("%Y-%m-%d"),
                "description": "바로빌 자주묻는질문 (FAQ)",
                "generated_by": "Excel to JSON Converter"
            },
            "categories": [],
            "items": []
        }
        
        categories_set = set()
        items = []
        
        for idx, row in df.iterrows():
            # 빈 행 스킵
            if pd.isna(row.get('ID')) or pd.isna(row.get('질문')):
                continue
            
            item = {
                "id": str(row['ID']).strip(),
                "question": str(row['질문']).strip(),
                "category": str(row.get('카테고리', '')).strip() if pd.notna(row.get('카테고리')) else '기타'
            }
            
            # 카테고리 수집
            if item["category"]:
                categories_set.add(item["category"])
            
            # 표시순서 (선택)
            if pd.notna(row.get('표시순서')):
                try:
                    item["order"] = int(row['표시순서'])
                except (ValueError, TypeError):
                    item["order"] = idx + 1
            else:
                item["order"] = idx + 1
            
            # 답변 처리 (content 배열 또는 answer 필드)
            answer_text = None
            if pd.notna(row.get('답변')):
                answer_text = str(row['답변']).strip()
            
            # 컨텐츠 필드가 있으면 content 배열로 변환 시도
            if pd.notna(row.get('컨텐츠')) and str(row.get('컨텐츠')).strip() != '-':
                # 컨텐츠 필드에 이미지 파일명이나 구조화된 정보가 있을 수 있음
                # 간단한 텍스트인 경우 content 배열로 변환
                content_text = str(row['컨텐츠']).strip()
                if answer_text:
                    # answer와 content를 결합
                    item["content"] = [
                        {
                            "type": "text",
                            "content": answer_text
                        }
                    ]
                    # 컨텐츠에 이미지 정보가 포함되어 있으면 파싱 시도
                    # 예: "이미지: tax-issuance-step1.png" 형식
                    if '이미지:' in content_text or '.png' in content_text or '.jpg' in content_text:
                        # 이미지 정보 추출 (간단한 파싱)
                        lines = content_text.split('\n')
                        for line in lines:
                            line = line.strip()
                            if line.startswith('이미지:') or line.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                                img_path = line.replace('이미지:', '').strip()
                                if not img_path.startswith('/'):
                                    img_path = f"/faq-images/{img_path}"
                                item["content"].append({
                                    "type": "image",
                                    "src": img_path,
                                    "alt": f"FAQ 이미지 {len(item['content'])}",
                                    "caption": ""
                                })
                else:
                    # answer가 없고 content만 있는 경우
                    item["content"] = [
                        {
                            "type": "text",
                            "content": content_text
                        }
                    ]
            elif answer_text:
                # answer만 있는 경우 (하위 호환성)
                item["answer"] = answer_text
            
            # 관련 가이드 (선택)
            if pd.notna(row.get('관련가이드URL')) and str(row.get('관련가이드URL')).strip() != '-':
                item["relatedGuides"] = self._parse_guides(row.get('관련가이드URL', ''))
            
            # 챗봇 지식베이스 연결 (선택)
            if pd.notna(row.get('챗봇 지식베이스 연결')) and str(row.get('챗봇 지식베이스 연결')).strip() != '-':
                item["relatedKnowledgeId"] = str(row.get('챗봇 지식베이스 연결')).strip()
            
            items.append(item)
            print(f"✓ FAQ 변환 완료: {item['id']} - {item['question'][:30]}...")
        
        faq_data["categories"] = sorted(list(categories_set))
        faq_data["items"] = items
        
        return faq_data
    
    def _map_type(self, category: str) -> str:
        """구분을 JSON type으로 매핑"""
        mapping = {
            '인사': 'intent',
            '개념': 'knowledge',
            '문제해결': 'case',
            '실무가이드': 'knowledge',
            '실무노하우': 'knowledge',
            'Case': 'case'
        }
        return mapping.get(str(category).strip(), 'knowledge')
    
    def _parse_keywords(self, keywords_str: str) -> List[str]:
        """쉼표로 구분된 키워드 문자열을 리스트로 변환"""
        if pd.isna(keywords_str) or str(keywords_str).strip() in ['', '-']:
            return []
        
        keywords = [k.strip() for k in str(keywords_str).split(',')]
        return [k for k in keywords if k]
    
    def _parse_guides(self, guide_str: str) -> List[Dict]:
        """관련 가이드 문자열을 객체 배열로 변환
        
        형식: "타이틀|URL|아이콘"
        """
        if pd.isna(guide_str) or str(guide_str).strip() in ['', '-']:
            return []
        
        guides = []
        for guide in str(guide_str).split('\n'):
            guide = guide.strip()
            if not guide or guide == '-':
                continue
            
            parts = guide.split('|')
            if len(parts) >= 2:
                guide_obj = {
                    "title": parts[0].strip(),
                    "url": parts[1].strip()
                }
                if len(parts) >= 3 and parts[2].strip():
                    guide_obj["icon"] = parts[2].strip()
                else:
                    guide_obj["icon"] = "📘"
                
                guides.append(guide_obj)
        
        return guides
    
    def generate_metadata(self, total_items: int) -> Dict:
        """메타데이터 생성"""
        return {
            "version": "2.0.0",
            "updated_at": datetime.now().strftime("%Y-%m-%d"),
            "description": "바로빌 AI 통합 지식베이스 - 세금계산서 전문",
            "total_items": total_items,
            "generated_by": "Excel to JSON Converter"
        }
    
    def validate_data(self) -> bool:
        """데이터 검증"""
        errors = []
        warnings = []
        
        # ID 중복 체크
        ids = [item['id'] for item in self.data['items']]
        duplicate_ids = [id for id in ids if ids.count(id) > 1]
        if duplicate_ids:
            errors.append(f"중복 ID 발견: {list(set(duplicate_ids))}")
        
        # 필수 필드 체크
        for item in self.data['items']:
            item_id = item.get('id', 'UNKNOWN')
            
            # 필수 필드
            if not item.get('title'):
                errors.append(f"[{item_id}] title이 없습니다.")
            if not item.get('keywords'):
                warnings.append(f"[{item_id}] 키워드가 없습니다.")
            if not item.get('responses'):
                errors.append(f"[{item_id}] 답변이 없습니다.")
            
            # 우선순위 범위 체크
            priority = item.get('priority', 5)
            if not (1 <= priority <= 10):
                warnings.append(f"[{item_id}] 우선순위가 1-10 범위를 벗어납니다: {priority}")
            
            # 답변 길이 체크
            responses = item.get('responses', {})
            for tone, text in responses.items():
                if len(text) < 20:
                    warnings.append(f"[{item_id}] {tone} 답변이 너무 짧습니다 ({len(text)}자)")
        
        # 결과 출력
        if errors:
            print("\n❌ 검증 실패:")
            for error in errors:
                print(f"  - {error}")
            return False
        
        if warnings:
            print("\n⚠️  경고:")
            for warning in warnings:
                print(f"  - {warning}")
        
        print(f"\n✅ 검증 성공: {len(self.data['items'])}개 항목")
        return True
    
    def convert(self) -> Dict:
        """전체 변환 프로세스 실행"""
        print("=" * 60)
        print("바로빌 챗봇 데이터 변환 시작")
        print("=" * 60)
        
        # 1. 엑셀 로드
        print("\n[1/4] 엑셀 파일 로드 중...")
        sheets = self.load_excel()
        
        # 2. 메인 데이터 변환
        print("\n[2/4] 질문&답변 데이터 변환 중...")
        main_sheet_names = [name for name in sheets.keys() if '질문' in name or 'Main' in name or 'main' in name]
        if main_sheet_names:
            self.data['items'] = self.convert_main_data(sheets[main_sheet_names[0]])
        else:
            print("⚠️  질문답변 시트를 찾을 수 없습니다. 첫 번째 시트를 사용합니다.")
            self.data['items'] = self.convert_main_data(list(sheets.values())[0])
        
        # 3. 동의어 변환
        print("\n[3/5] 동의어 사전 변환 중...")
        synonym_sheet_names = [name for name in sheets.keys() if '동의어' in name]
        if synonym_sheet_names:
            self.data['synonyms'] = self.convert_synonyms(sheets[synonym_sheet_names[0]])
        else:
            print("⚠️  동의어 시트를 찾을 수 없습니다. 건너뜁니다.")
        
        # 4. FAQ 변환
        print("\n[4/5] FAQ 데이터 변환 중...")
        faq_sheet_names = [name for name in sheets.keys() if 'FAQ' in name.upper() or 'faq' in name.lower() or '자주묻는질문' in name]
        if faq_sheet_names:
            self.faq_data = self.convert_faq_data(sheets[faq_sheet_names[0]])
            print(f"✓ FAQ 항목 {len(self.faq_data['items'])}개 변환 완료")
            print(f"✓ FAQ 카테고리 {len(self.faq_data['categories'])}개: {', '.join(self.faq_data['categories'])}")
        else:
            print("⚠️  FAQ 시트를 찾을 수 없습니다. 건너뜁니다.")
        
        # 5. 메타데이터 생성
        print("\n[5/5] 메타데이터 생성 중...")
        self.data['metadata'] = self.generate_metadata(len(self.data['items']))
        
        print("\n" + "=" * 60)
        print("✅ 변환 완료!")
        print("=" * 60)
        print(f"  - 총 항목 수: {len(self.data['items'])}개")
        print(f"  - 동의어 수: {len(self.data['synonyms'])}개")
        if self.faq_data:
            print(f"  - FAQ 항목 수: {len(self.faq_data['items'])}개")
        
        return self.data
    
    def save_json(self, output_file: str, faq_output_file: str = None):
        """JSON 파일로 저장"""
        try:
            # 메인 지식베이스 JSON 저장
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)
            print(f"\n💾 JSON 파일 저장: {output_file}")
            
            # FAQ JSON 저장 (있는 경우)
            if self.faq_data:
                if faq_output_file:
                    faq_file = faq_output_file
                else:
                    # output_file 경로에서 FAQ 파일명 생성
                    import os
                    base_dir = os.path.dirname(output_file)
                    base_name = os.path.basename(output_file)
                    name_without_ext = os.path.splitext(base_name)[0]
                    faq_file = os.path.join(base_dir, f"{name_without_ext}-faq.json")
                
                with open(faq_file, 'w', encoding='utf-8') as f:
                    json.dump(self.faq_data, f, ensure_ascii=False, indent=2)
                print(f"💾 FAQ JSON 파일 저장: {faq_file}")
        except Exception as e:
            print(f"❌ JSON 저장 실패: {e}")
            sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='바로빌 챗봇 엑셀 데이터를 JSON으로 변환',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python excel_to_json_converter.py -i data.xlsx -o output.json
  python excel_to_json_converter.py -i data.xlsx -o output.json --validate
        """
    )
    
    parser.add_argument('-i', '--input', required=True, help='입력 엑셀 파일 경로')
    parser.add_argument('-o', '--output', required=True, help='출력 JSON 파일 경로 (지식베이스)')
    parser.add_argument('--faq-output', help='FAQ JSON 출력 파일 경로 (선택, 미지정 시 자동 생성)')
    parser.add_argument('-v', '--validate', action='store_true', help='변환 후 데이터 검증')
    parser.add_argument('--pretty', action='store_true', help='JSON 파일을 읽기 쉽게 포맷팅')
    
    args = parser.parse_args()
    
    # 변환 실행
    converter = ChatbotDataConverter(args.input)
    data = converter.convert()
    
    # 검증 (옵션)
    if args.validate:
        print("\n" + "=" * 60)
        print("데이터 검증 중...")
        print("=" * 60)
        if not converter.validate_data():
            print("\n❌ 검증 실패. JSON 파일은 생성되지 않습니다.")
            sys.exit(1)
    
    # JSON 저장
    converter.save_json(args.output, args.faq_output)
    
    print("\n🎉 작업이 성공적으로 완료되었습니다!")
    print(f"\n다음 단계:")
    print(f"  1. {args.output} 파일을 확인하세요")
    if converter.faq_data:
        import os
        if args.faq_output:
            faq_file = args.faq_output
        else:
            base_name = os.path.splitext(os.path.basename(args.output))[0]
            faq_file = os.path.join(os.path.dirname(args.output), f"{base_name}-faq.json")
        print(f"  2. {faq_file} 파일을 확인하세요")
        print(f"  3. 프로젝트의 src/data/ 폴더에 두 파일을 복사하세요")
        print(f"  4. 개발 서버를 재시작하세요: npm run dev")
    else:
        print(f"  2. 프로젝트의 src/data/ 폴더에 복사하세요")
        print(f"  3. 개발 서버를 재시작하세요: npm run dev")


if __name__ == '__main__':
    main()
