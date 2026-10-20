#!/bin/bash

echo "🎨 감정 기반 예술 추천 시스템 - 완전 재설치"
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

# 새로운 의존성 설치
echo "📥 의존성 설치 중..."
npm install

echo ""
echo "✅ 설치 완료!"
echo ""
echo "🔍 테스트 방법:"
echo "1. CDN 테스트: 브라우저에서 test.html 직접 열기"
echo "2. 개발 서버: npm run dev"
echo ""
echo "💡 여전히 레이아웃이 안되면:"
echo "   - 브라우저 개발자 도구(F12) 열기"
echo "   - Console 탭에서 에러 확인"
echo "   - Network 탭에서 globals.css 로드 확인"
echo ""
