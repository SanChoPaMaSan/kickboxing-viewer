# HW3 설정 — STRIKE LAB

기존 React·Three.js 앱에 Docker 컨테이너와 GitHub Actions CI/CD를 추가한다. 제공된 HW2/HW3 비교 이미지에 맞춘 구현이며 공식 과제 원문, 제출 형식과 MLOps 평가 기준은 아직 확인되지 않았다.

## 1. 로컬 Docker 실행

Docker Desktop의 Linux 컨테이너 또는 Linux Docker Engine이 필요하다. 저장소 루트에서:

```sh
docker build --build-arg RELEASE=local -t strikelab:local .
docker run --rm --name strikelab-local -p 8080:80 strikelab:local
```

브라우저에서 `http://localhost:8080` 접속. `/healthz`는 상태 확인, `/release.json`은 빌드 버전 확인용이다. Docker 빌드 안에서 기존 6개 앱 테스트, TypeScript 검사, Vite 빌드를 실행한다. Node 빌드 단계와 Nginx 실행 단계를 분리한다. 이미지에 Git 이력, 토큰, 보고서, node_modules를 복사하지 않는다.

## 2. Docker Hub 연결

Docker Hub에서 `strikelab` 저장소를 만들고 이미지 push 권한의 액세스 토큰을 발급한다. GitHub 저장소 Settings → Secrets and variables → Actions에 다음을 등록한다. 토큰은 채팅이나 코드에 붙여넣지 않는다.

| 종류 | 이름 | 값 |
|---|---|---|
| Repository variable | `DOCKERHUB_USERNAME` | Docker Hub 사용자명 |
| Repository secret | `DOCKERHUB_TOKEN` | 발급한 액세스 토큰 |
| Repository variable | `HW3_DEPLOY_ENABLED` | 서버 준비가 끝난 뒤 `true` |

`main` push 시 앱 테스트 → Docker 빌드 → 실제 컨테이너의 HTML·JS·CSS·버전 응답 검사 → 성공한 이미지 push 순서로 실행한다. 이미지 태그는 커밋 SHA이며 배포는 `repository@sha256:...`로 고정한다. PR에서는 빌드·검증만 수행한다. Docker Hub 사용자명이 없으면 push를 건너뛰므로 CI 성공만으로 Docker Hub 업로드 완료라고 쓰면 안 된다.

## 3. 배포 서버와 Runner

Linux x64 서버에 Docker Engine과 Python 3를 준비한다. 현재 워크플로의 배포 포트는 8081이다. 다른 서비스가 이 포트를 점유하면 안 된다. 외부 서버를 사용할 경우 서버 방화벽과 클라우드 보안 그룹의 인바운드 포트도 확인한다. 이 구성은 실습용 HTTP이며 HTTPS는 도메인과 인증서를 연결하는 추가 설정이 필요하다.

GitHub Settings → Actions → Runners → New self-hosted runner의 Linux x64 설치 명령을 서버에서 실행한다. Runner 사용자에게 Docker 명령 권한이 있어야 하며 사용자 정의 라벨 `strikelab`을 추가한다. Runner를 서비스로 등록한다. GitHub Environment `hw3-production`을 만들고 배포 브랜치를 main으로 제한한다.

공개 저장소의 self-hosted runner는 외부 코드 실행 위험이 있으므로 개인 작업 PC 대신 별도 실습 서버를 사용한다. 이 워크플로는 PR을 self-hosted runner에서 실행하지 않는다. 저장소의 다른 워크플로에서도 같은 원칙이 유지되어야 한다.

Runner와 Docker daemon은 같은 Linux 호스트에서 실행해야 한다. 원격 Docker context나 컨테이너 내부 Runner는 이 경로 마운트 구성을 그대로 사용할 수 없다.

서버 상태 디렉터리는 Runner 사용자의 `~/.local/share/strikelab`이며 배포 도중 바꾸거나 지우면 안 된다. 최초 배포 이후 포트도 8081로 유지한다. 수동 실행 시에도 `--port 8081`을 지정한다. 서버 준비 후 `HW3_DEPLOY_ENABLED=true`를 설정한다.

## 4. 전환과 복구

1. digest로 고정한 이미지를 pull하고 별도 컨테이너를 시작한다.
2. Docker health와 `release.json`이 기대한 커밋인지 확인한다.
3. 해시 이름을 가진 JS/CSS를 공유 assets 폴더에 누적한다. 구버전 HTML을 열어 둔 사용자도 이전 에셋을 받을 수 있다.
4. Nginx 설정 검사를 통과하면 graceful reload로 새 컨테이너에 연결한다.
5. 실제 호스트 포트의 버전 응답까지 확인한 후 `active.json`을 갱신한다.
6. 전환 실패 시 이전 Nginx 설정을 복원한다. 복구 명령 자체가 실패하면 작업도 실패하므로 서버 로그를 확인해야 한다.

첫 배포는 기존 서비스가 없어 무중단 전환 검증 대상이 아니다. 두 번째 배포부터 검증한다. 구버전 컨테이너와 assets는 자동 삭제하지 않는다. 기존 연결과 롤백을 위해 보존하며, 장기간 사용 시 관리자가 연결 종료와 보존 기간을 확인하고 정리해야 한다. 단일 서버 장애 자체에 대한 고가용성은 제공하지 않는다.

수동으로 이전 버전을 재배포할 때도 이전 digest와 그 이미지의 정확한 커밋 SHA를 사용한다. 아래 대문자 값은 실제 값으로 교체한다.

```sh
python3 deploy/deploy.py USER/strikelab@sha256:PREVIOUS_DIGEST PREVIOUS_COMMIT_SHA --port 8081
```

## 5. 무중단 전환 증빙

첫 배포가 정상 실행된 상태에서 별도 터미널에서 검사기를 실행하고, 검사 중 앱 문구를 수정해 main에 push한다. 180초 안에 배포가 끝나지 않으면 시간을 늘려 전환 전후 전체 구간을 포함한다.

```sh
python3 deploy/probe.py http://SERVER_IP:8081 --seconds 180 --output artifacts/availability.json
```

이 도구는 반복해서 HTML, 참조 JS/CSS, 이전 샘플에서 본 에셋과 버전 응답을 확인한다. 오류가 있으면 종료 코드 1을 반환한다. 결과에서 `failures: 0`뿐 아니라 `releases`에 이전·새 SHA 둘 다 있어야 실제 전환을 관측한 것이다. 한 버전만 있으면 배포 구간을 검증한 증거가 아니다. 일정 간격의 샘플링이며 모든 순간의 무중단이나 3D 브라우저 렌더링까지 증명하지는 않는다. 브라우저의 기술 선택·재생도 별도 확인한다.

제출 증빙 후보: Docker Hub 이미지/태그, GitHub Actions 실행 화면, Runner 연결 화면, 서버의 앱 실행 화면, 버전 전환 JSON, 변경 전후 화면. 실제 제출 형식은 공식 공지를 따른다.

## 6. MLOps 범위

현 앱에는 ML 학습·추론 모델, 데이터셋, 정확도 지표가 없다. 3D 모델과 역기구학 계산을 MLOps로 보고하지 않는다. MLOps가 필수라면 공식 조건에 맞는 별도 ML 기능과 평가 데이터, 개선 전후 지표가 필요하다. 현재 제출 준비 상태에서 미완료 항목이다.

## 공식 참고

- Docker multi-stage builds: https://docs.docker.com/build/building/multi-stage/
- GitHub Docker image publishing: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
- Self-hosted runners: https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners
- Nginx graceful configuration reload: https://nginx.org/en/docs/control.html
