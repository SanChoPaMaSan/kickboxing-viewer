# STRIKE LAB — 3D 킥복싱 기술 뷰어

카드를 선택해 10가지 킥복싱 동작을 여러 각도에서 탐색하는 정적 웹앱입니다. AI 보조 개발과 GitHub Actions 자동 배포를 실습하는 HW2 프로젝트입니다.

## 실행

Node.js 24와 npm을 사용합니다. 이 폴더를 저장소 루트로 사용하세요.

```powershell
cd "C:\Users\admin\Desktop\2_2\오픈소스\kickboxing-viewer"
npm ci
npm run dev
```

터미널에 표시된 로컬 주소를 브라우저에서 엽니다. 종료는 `Ctrl+C`입니다. `dist/index.html`을 파일로 직접 열지 마세요.

```powershell
npm test
npm run typecheck
npm run build
npm run preview
```

## 기능

| 화면 왼쪽 | 화면 오른쪽 |
| --- | --- |
| 잽 / 왼손 | 스트레이트 / 오른손 |
| 훅 / 왼손 | 훅 / 오른손 |
| 어퍼컷 / 왼손 | 어퍼컷 / 오른손 |
| 미들킥 / 왼발 | 미들킥 / 오른발 |
| 로우킥 / 왼발 | 로우킥 / 오른발 |

왼손·왼발은 캐릭터 자신의 해부학적 좌우입니다. 정면에서 관람자가 보는 좌우와 반대입니다. 왼손 장갑은 연두색, 오른손 장갑은 흰색입니다. 오소독스 자세에서 왼발이 앞에 있습니다. 카메라를 회전해도 카드 위치는 고정됩니다.

- 기술 선택 즉시 재생, 완료 후 가드 복귀
- 재생/일시정지, 다시 재생, 반복, 0.5배속/1배속, 진행률
- 드래그 회전, 휠/터치 확대·축소, 시점 초기화
- 모바일에서 캐릭터 아래 두 열로 카드 배치
- WebGL 초기화 실패 및 context loss 안내

## 구조와 애니메이션

- React 19, TypeScript 5.9, Vite 7, Three.js 0.180
- `src/motion.ts`: 기술 데이터와 준비·타격·회수 구간 보간, 2-link IK
- `src/scene.ts`: 직접 만든 관절형 캐릭터, 조명, 그림자, 카메라, 재생 상태
- `src/main.tsx`: 카드 및 재생 컨트롤
- `tests/motion.test.ts`: 부위, 복귀, 연속성, 관절 도달 범위, 기술 높이 차이 검사
- 외부 API, 데이터베이스, 로그인, 모델 다운로드 없음

## GitHub Pages 배포

설정된 원격 저장소는 https://github.com/SanChoPaMaSan/kickboxing-viewer.git 입니다. 아래는 기존 HW2 Pages 배포 절차이며, 이번 HW3 작업에서는 원격 push와 실제 배포를 수행하지 않았습니다.

1. 이 폴더의 내용을 GitHub 저장소 루트에 올립니다. `.github`와 `.gitignore`도 포함합니다.
2. 저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 선택합니다.
3. `main`에 push하면 `.github/workflows/deploy.yml`이 `npm ci` → `npm test` → 타입 검사와 빌드 → Pages 배포를 수행합니다.
4. PR에서는 테스트와 빌드만 수행하고 배포하지 않습니다.
5. Actions 성공 및 Pages 주소 접속을 확인합니다. 화면 문구 변경을 push하여 자동 갱신까지 확인하면 과제 증거로 사용할 수 있습니다.

Vite `base: './'`로 빌드 에셋 경로를 상대 경로로 생성합니다. 따라서 `/저장소이름/`에서도 로딩할 수 있습니다. 별도의 클라이언트 라우팅은 없습니다. 인증 토큰을 소스에 넣지 않으며 배포에는 GitHub의 기본 작업 토큰과 OIDC 권한을 사용합니다.

공식 참고: https://vite.dev/guide/static-deploy.html#github-pages

## HW3 Docker와 CI/CD

기존 앱을 Docker로 실행하고 Linux Self-hosted Runner에서 새 컨테이너를 검증한 뒤 Nginx 트래픽을 전환하는 구성을 추가했습니다. 기존 Pages 워크플로와 별도로 `.github/workflows/hw3.yml`이 실행됩니다.

- 설정 및 실행: [HW3_SETUP.md](docs/HW3_SETUP.md)
- 현재 검증 상태와 제출 증빙: [HW3_STATUS.md](docs/HW3_STATUS.md)
- Docker Hub 계정 설정 전에는 컨테이너 CI만 실행됩니다. 서버 배포는 `HW3_DEPLOY_ENABLED=true` 설정 후 활성화됩니다.
- 이 앱은 머신러닝 모델을 사용하지 않습니다. 3D 캐릭터를 ML 모델로 간주하지 않으며 MLOps 요구사항은 별도 확인이 필요합니다.

## 에셋과 라이선스

캐릭터, 장갑, 바닥과 동작은 이 프로젝트 코드로 직접 생성합니다. 외부 모델, 텍스처, 모션 캡처, 이미지, 웹폰트를 포함하지 않습니다. 출처와 검토한 후보는 `ASSETS.md`에 기록했습니다. 외부 에셋의 별도 저작자 표시 의무는 없습니다. 오픈소스 라이브러리의 고지는 `THIRD_PARTY_NOTICES.txt`에 보존합니다. 프로젝트 자체 소스에 적용할 배포 라이선스는 소유자가 결정할 수 있도록 아직 지정하지 않았습니다.

## 검증과 한계

실제 검증 기록은 `docs/VALIDATION.md`, 실행 화면은 `docs/screenshots/`에 있습니다. 보고서용 한국어 초안은 `docs/HW2_REPORT_DRAFT.md`입니다.

직접 만든 단순화된 관절형 모델이며 전문가가 검증한 자세 교정 도구가 아닙니다. 실제 킥복싱의 발놀림, 무게중심과 충격을 물리적으로 시뮬레이션하지 않습니다. 특히 왼발 킥은 스위치 스텝을 생략한 축약 동작입니다. 동작 도중 기술을 바꾸면 현재 자세에서 새 동작으로 0.18초간 보간합니다. 충돌 판정은 없습니다. WebGL 2 지원 브라우저가 필요하며 실제 모바일 기기 성능과 모든 GPU 조합은 검증하지 않았습니다. JavaScript 번들은 Three.js를 포함해 약 741 KB(전송 압축 약 201 KB)이며 Vite의 500 KB 청크 권고 경고가 있습니다.
