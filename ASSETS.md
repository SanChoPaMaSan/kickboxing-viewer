# 에셋 출처 및 선택 기록

## 포함한 에셋

모든 캐릭터 메시(구·원통 조합), 바닥, 링, 색상, 애니메이션은 `src/scene.ts` 및 `src/motion.ts`에서 직접 생성합니다. 외부 리깅 모델 또는 애니메이션 파일은 사용하지 않았습니다. 외부 이미지·웹폰트도 사용하지 않습니다. 운영체제 글꼴을 사용합니다.

## 검토한 외부 후보

- Kenney: 공식 https://kenney.nl/support 에서 에셋 페이지 자산이 CC0이며 attribution이 필수가 아님을 확인했습니다. 이번 10개 킥복싱 동작에 맞는 세트는 확보하지 않아 포함하지 않았습니다.
- Mixamo: https://community.adobe.com/questions-696/mixamo-faq-licensing-royalties-ownership-eula-and-tos-589400 에서 원본 파일 배포 제약을 안내합니다. 공개 소스 저장소에 원본 에셋을 넣는 방식으로 채택하지 않았습니다.

검토일: 2026-11-01. 후보에 대한 검토는 프로젝트에 해당 자산을 사용했다는 의미가 아닙니다.

## 라이브러리

React, React DOM, Three.js는 MIT 라이선스입니다. 설치된 패키지의 원문 고지를 THIRD_PARTY_NOTICES.txt에 포함했습니다. 개발 의존성의 라이선스는 각 패키지에 포함되어 있습니다. 잠금 파일은 정확한 설치 버전을 기록합니다.
