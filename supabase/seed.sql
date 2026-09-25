-- Local-only sample data for development and the E2E tests (tests/e2e).
-- `supabase db reset` loads it after the migrations; `supabase db push` never
-- runs it, so the production database keeps only what the admin adds.

insert into public.seasons (name) values ('26-1'), ('25-2');

insert into public.projects (season_id, title, summary, markdown, github_url)
select id, '예시 프로젝트: 멀티모달 검색', '#Multimodal #Retrieval', $md$
## 소개

> 로컬 개발과 테스트를 위한 예시 프로젝트입니다.

이미지와 텍스트를 같은 임베딩 공간에 두고 검색하는 파이프라인을 만들었습니다.

- 데이터 수집과 정제
- 대조 학습으로 인코더 미세 조정

## 결과

| 모델 | Recall@1 | Recall@5 | Recall@10 | 파라미터 수 | 학습 시간 | 비고 |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline | 41.2 | 68.0 | 77.5 | 150M | 6h | 공개 체크포인트 |
| Ours | 47.9 | 73.4 | 82.1 | 150M | 9h | 대조 학습 추가 |
$md$, 'https://github.com/AIKU-Official'
from public.seasons where name = '26-1';

insert into public.projects (season_id, title, summary, markdown)
select id, '예시 프로젝트: 한국어 LLM 평가', '#NLP #LLM', $md$
## 소개

한국어 지시 따르기 능력을 평가하는 벤치마크를 설계했습니다.
$md$
from public.seasons where name = '25-2';
