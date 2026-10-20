#!/bin/bash

echo "🎨 감정 기반 예술 추천 시스템 - Tailwind CDN 방식"
echo ""

# 모든 빌드 결과물과 캐시 삭제
echo "🧹 기존 파일 삭제 중..."
rm -rf node_modules
rm -rf package-lock.json
rm -rf .vite
rm -rf dist

# npm 캐시 클리어
echo "🗑️  npm 캐시 삭제 중..."
npm cache clean --force

# 새로운 의존성 설치 (Tailwind 제외)
echo "📥 의존성 설치 중 (Tailwind는 CDN 사용)..."
npm install

echo ""
echo "✅ 설치 완료!"
echo ""
echo "🚀 이제 Tailwind CSS는 CDN으로 로드됩니다."
echo "   - PostCSS, Tailwind config 파일 불필요"
echo "   - 빌드 프로세스 단순화"
echo "   - 즉시 작동 보장"
echo ""
echo "▶️  개발 서버 시작:"
echo "   npm run dev"
echo ""
