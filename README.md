# AIKU 공식 홈페이지

고려대학교 딥러닝 학회 AIKU의 공식 홈페이지입니다. 공개 페이지(소개, 활동, 커리큘럼, 프로젝트, Members, 컨택)와 운영진용 관리자 페이지(`/admin`)로 구성됩니다.

| 영역 | 사용 기술 |
| --- | --- |
| 웹 | Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS v4 |
| 데이터 | Supabase (Postgres + Storage) |
| 배포 | Vercel |
| 테스트 | Vitest (단위), Playwright (E2E) |

## 로컬에서 실행하기

필요한 것: Node.js 24, pnpm, Docker Desktop(로컬 Supabase용). 클라우드 계정 없이도 전부 로컬에서 실행할 수 있습니다.

```bash
pnpm install
pnpm db:start                 # 로컬 Supabase 실행 (처음엔 이미지 내려받느라 몇 분 걸림)
cp .env.example .env.local    # 아래 설명대로 값 채우기
pnpm db:reset                 # 마이그레이션과 예시 데이터(supabase/seed.sql) 적용 (DB 초기화)
pnpm dev                      # http://localhost:3000
```

`.env.local` 값은 이렇게 채웁니다.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`: `pnpm exec supabase status`에 나오는 `API_URL`, `PUBLISHABLE_KEY`, `SECRET_KEY`
- `ADMIN_ID`, `ADMIN_PASSWORD`: 로컬에서 쓸 관리자 계정 (아무 값)
- `SESSION_SECRET`: `openssl rand -base64 48`로 만든 값
- `CRON_SECRET`: `openssl rand -hex 24`로 만든 값

### 자주 쓰는 명령어

| 명령어 | 설명 |
| --- | --- |
| `pnpm dev` | 개발 서버 |
| `pnpm build` / `pnpm start` | 프로덕션 빌드 / 실행 |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | 린트 / 타입 검사 / 단위 테스트 |
| `pnpm test:e2e` | Playwright 스모크 테스트 (`pnpm build` 후, 로컬 DB와 데이터가 있어야 함) |
| `pnpm db:start` / `pnpm db:stop` | 로컬 Supabase 켜기 / 끄기 (Studio: http://127.0.0.1:54323) |
| `pnpm db:reset` | 로컬 DB를 마이그레이션 기준으로 초기화하고 예시 데이터(`supabase/seed.sql`, 로컬 전용)를 넣기 |
| `pnpm db:types` | DB 스키마에서 TypeScript 타입 재생성 (`src/lib/supabase/database.types.ts`) |
| `pnpm storage:gc [--apply]` | 어디에서도 쓰지 않는 업로드 파일 찾기 / 지우기 |

## 폴더 구조

```text
src/
  app/(public)/        공개 페이지 (about, activities, curriculum, projects, members, contact)
  app/(admin)/         로그인, 관리자 페이지
  app/api/cron/        매일 실행되는 keepalive 작업
  actions/             관리자 Server Actions (저장, 삭제, 순서 변경, 업로드 URL 발급)
  components/          화면 컴포넌트 (layout, home, projects, markdown, admin 등)
  lib/                 데이터 조회, 인증, 입력 검증, 마크다운 처리, Storage 규칙
  proxy.ts             로그인하지 않은 /admin 접근을 /login으로 보냄
supabase/migrations/   DB 스키마, 정렬 함수, 권한(RLS), Storage 버킷
scripts/               Storage 정리
tests/e2e/             Playwright 스모크 테스트
public/assets/         로고, 파비콘, 배경 이미지
```

## 콘텐츠 관리

**DB에서 관리하는 콘텐츠:** 소식, 시즌과 프로젝트, 기수와 멤버. 모두 `/login`에서 관리자 계정으로 로그인한 뒤 `/admin`에서 관리합니다.

- **새 분기 프로젝트:** 시즌을 먼저 추가한 다음 그 시즌에 프로젝트를 올립니다. 프로젝트가 있는 시즌과 멤버가 있는 기수는 삭제할 수 없습니다.
- **순서 변경:** 카드를 드래그하거나 ⋮⋮ 손잡이에 포커스한 뒤 스페이스와 방향키로 옮깁니다. 바꾼 순서는 공개 페이지에 그대로 반영됩니다.
- **공개 페이지 반영:** 저장하면 즉시 반영됩니다. Supabase 대시보드에서 직접 고친 내용은 최대 1시간 뒤에 반영됩니다.
- **업로드 제한:**
  - 발표자료는 PPT, PPTX, PDF이고 최대 50MB입니다.
  - 이미지는 PNG, JPG, WebP, GIF이고 최대 10MB입니다.
  - 파일은 브라우저에서 Supabase Storage로 바로 올라가고, 항목을 삭제하면 같이 지워집니다.

프로젝트 설명은 마크다운으로 작성합니다. 노션에서 복사해 붙여넣어도 됩니다. 알아둘 규칙은 다음과 같습니다.

- `#` 제목은 한 단계 작게 표시됩니다(프로젝트 제목 아래에 오기 때문입니다). 보통 `##`부터 쓰면 됩니다.
- 이미지만 있는 줄은 캡션이 붙은 그림이 됩니다. 캡션은 `![캡션](주소)`의 대괄호 안 글자입니다.
- 이미지 줄이 연달아 있으면 가로 그리드로 묶입니다. 빈 줄로 떨어져 있어도 연달아 있는 것으로 봅니다.
- 표는 모바일에서 가로 스크롤됩니다. HTML 태그는 표시되지 않습니다.
- "프로젝트 이미지"로 올린 이미지는 설명 맨 아래에 순서대로 붙습니다.

**코드에서 관리하는 문구:** 소개, 활동, 커리큘럼, 컨택 페이지의 문구와 모집 안내입니다. `src/app/(public)/<페이지>/page.tsx`를 수정합니다. 공식 채널 링크와 메뉴는 `src/lib/site.ts`에 있습니다.

## 배포

> 계정은 개인 계정이 아니라 **AIKU 공식 계정**(GitHub org 등록 메일 `ku.deepintodeep@gmail.com`)으로 만들어야 회장이 바뀌어도 그대로 인계할 수 있습니다. 운영진 개인 계정은 멤버로만 추가합니다.

### 1. Supabase

1. 공식 계정으로 Supabase에 가입하고 organization "AIKU"를 만든 뒤, 프로젝트를 **서울(ap-northeast-2)** 리전에 만듭니다.
2. 로컬에서 스키마를 올립니다.

   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <프로젝트 ref>
   pnpm exec supabase db push        # supabase/migrations 적용 (테이블, 함수, RLS, aiku-uploads 버킷)
   ```

3. Project Settings → API Keys에서 Project URL, publishable key, secret key를 확인합니다. **secret key는 절대 코드나 브라우저에 넣지 않습니다.**
### 2. Vercel

1. 공식 계정으로 Vercel(Hobby)에 가입하고 GitHub `AIKU-Official/aiku-page` 레포를 Import 합니다.
   - Vercel GitHub App을 org에 설치하려면 org owner의 승인이 필요합니다.
   - Hobby 플랜은 **public** org 레포만 배포할 수 있으니 레포를 public으로 유지합니다.
2. Settings → Environment Variables에 `.env.example`의 변수를 모두 넣습니다.
   - `NEXT_PUBLIC_SITE_URL`은 실제 도메인으로 넣습니다(예: `https://aiku.example.com`).
   - `ADMIN_PASSWORD`는 12자 이상이어야 합니다.
   - `NEXT_PUBLIC_*` 값을 바꾼 뒤에는 재배포해야 반영됩니다.
3. 배포하면 `vercel.json` 설정이 적용됩니다.
   - 함수는 서울(`icn1`) 리전에서 실행됩니다.
   - `/api/cron/keepalive`가 매일 03:00 UTC에 실행됩니다.
4. 커스텀 도메인을 쓴다면 공식 계정 명의로 구입한 뒤 Settings → Domains에 연결합니다.

## 운영과 인계 체크리스트

- **넘겨줄 것:**
  - GitHub org owner 권한
  - Vercel과 Supabase 공식 계정 로그인 정보와 2단계 인증 복구 코드
  - 도메인 계정
  - 이 정보들은 운영진 공유 드라이브에 보관하고, 레포에는 절대 넣지 않습니다.
- **관리자 비밀번호 변경:** Vercel에서 `ADMIN_PASSWORD`를 바꾸고 재배포합니다. 모든 관리자를 로그아웃시키려면 `SESSION_SECRET`도 새 값으로 바꿉니다.
- **Supabase 무료 플랜 주의:**
  - **일시정지:** 약 7일간 DB 활동이 없으면 일시정지됩니다. keepalive cron이 이를 막으니 `CRON_SECRET`이 설정돼 있는지 확인합니다.
  - **전송량:** 월 전송량 한도는 약 5GB입니다. 큰 발표자료(20MB 이상)가 많이 다운로드되면 한도에 닿을 수 있으니, 필요하면 PDF로 줄이거나 외부 링크를 씁니다.
- **남은 파일 정리:** 가끔 `pnpm storage:gc`로 저장만 되고 쓰이지 않는 파일이 있는지 확인합니다.
- **스키마 변경:**
  1. `pnpm exec supabase migration new <이름>`으로 마이그레이션을 만듭니다.
  2. `pnpm db:reset`으로 로컬에서 확인합니다.
  3. `pnpm db:types`로 타입을 다시 생성합니다.
  4. 배포 전에 `pnpm exec supabase db push`로 운영 DB에 적용합니다.

## 보안 메모

- **권한 검사:** 관리자 권한은 모든 Server Action과 관리자 페이지에서 직접 확인합니다(`src/lib/actions/admin-action.ts`). `proxy.ts`는 편의상 리다이렉트만 합니다.
- **DB 접근:** 방문자는 publishable key로 공개 콘텐츠를 **읽기만** 할 수 있습니다(RLS). 쓰기는 서버의 secret key로만 합니다.
- **로그인 제한:** 같은 IP에서 15분에 5번 실패하면 로그인이 잠시 막힙니다.
- **레거시 참고:** 베타 버전 사이트(`legacy/`)는 참고용으로 로컬에만 두고 git에서는 제외합니다.
