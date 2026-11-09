# HW3 구현 및 검증 상태

확인일: 2026-11-09. 프로젝트: STRIKE LAB / kickboxing-viewer.

## 구현한 내용

- 테스트·타입 검사를 거치는 Docker multi-stage 빌드 및 Nginx 정적 파일 서버.
- healthz와 release.json을 통한 컨테이너 상태·배포 커밋 확인.
- GitHub-hosted runner의 이미지 빌드·실행 검사와 Docker Hub push 워크플로.
- Linux self-hosted runner의 새 버전 기동, 사전 검증, Nginx 전환, 실패 시 설정 복구.
- 기존 HTML이 참조하는 JS/CSS를 유지하기 위한 공유 assets 보존.
- HTML·에셋·버전을 반복 검사하는 가용성 증빙 도구.

## 실제로 통과한 로컬 검사

- `npm test`: 기존 앱 테스트 6개 통과.
- `npm run build`: TypeScript 검사 및 Vite 빌드 성공.
- `python -m unittest discover -s deploy/tests -v`: 배포 로직 테스트 6개 통과. Docker 명령은 mock으로 대체했다. 정상 전환, 잘못된 버전, 불건전한 컨테이너, reload 실패 복구, 공개 포트의 버전 불일치 복구, 설정 입력 검증을 검사했다.
- 앱 번들 약 741 KB로 Vite 500 KB 권고 경고가 남아 있다. 빌드 실패는 아니다.
- Docker Desktop 4.98.0 / Linux 엔진에서 실제 이미지 `jihoyun/strikelab:hw3-local` 빌드 성공. Docker 빌드 안에서도 앱 테스트 6개와 타입 검사·Vite 빌드 통과.
- `strikelab-hw3-local` 컨테이너를 `127.0.0.1:8080`에 실행하고 `running / healthy` 확인.
- HTML·참조 JS/CSS·release.json 반복 검사 13회 성공, 실패 0회. 버전은 `hw3-local-20261109`. 기록: `artifacts/docker-local-20261109.json` (Git 제외). 단일 버전의 로컬 실행 검사이며 무중단 전환 증거는 아니다.

## 아직 완료하지 않은 검증

- 새 워크플로의 GitHub Actions 실제 실행, Docker Hub push, Runner 등록, 서버 배포.
- 실제 배포 전후의 무중단 요청 측정과 브라우저 기능 재검증.
- ML 기능 및 모델 성능 개선. 현재 앱에는 ML 모델이 없다.
- 공식 과제 원문에 따른 필수 항목, 제출 형식과 마감일 대조.

위 미완료 항목은 설정 파일을 작성했다는 사실과 구분해야 한다. 이 문서는 배포 성공 보고서가 아니며, 원격 작업 후 실제 실행 URL·digest·측정 결과를 추가해야 한다.
