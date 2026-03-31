# mg-ceo-news

GitHub Pages와 GitHub Actions로 운영하는 간단한 CEO 모바일 뉴스 사이트입니다.

## 포함 파일

- `index.html`: 화면 골격
- `style.css`: 스타일
- `app.js`: `data/news.json` 렌더링
- `data/news.json`: 첫 배포용 샘플 데이터
- `scripts/generate-news.mjs`: RSS를 읽어 `data/news.json` 생성
- `.github/workflows/deploy-pages.yml`: push / 수동 / 예약 배포
- `package.json`: Node 의존성

## 처음 업로드 순서

1. 이 폴더 전체를 새 repo의 루트에 업로드
2. repo 이름을 `mg-ceo-news`로 맞추거나 원하는 이름으로 생성
3. `Settings > Pages > Source`가 `GitHub Actions`인지 확인
4. `main` 브랜치에 push
5. `Actions` 탭에서 workflow가 성공했는지 확인
6. 첫 배포 후 사이트 접속

## 특징

- 첫 배포부터 화면이 비지 않도록 샘플 `news.json` 포함
- 이후 Actions가 RSS를 읽어 `news.json` 갱신
- `push`만 해도 Pages 재배포
- 수동 실행과 예약 실행 모두 가능

## 수집 키워드

- 새마을금고
- 농협 금융
- 은행 금융

필요하면 `scripts/generate-news.mjs`의 `FEEDS` 배열에서 키워드를 바꾸면 됩니다.
