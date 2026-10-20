/**
 * CSS 디버그 헬퍼 스크립트
 * 브라우저 콘솔에서 window.debugCSS() 실행
 */

window.debugCSS = function() {
  console.clear();
  console.log('%c🔍 CSS DIAGNOSTICS STARTING...', 'font-size: 20px; color: #ff6b9d; font-weight: bold;');
  console.log('');
  
  // 1. Tailwind CDN 확인
  console.group('1️⃣ Tailwind CDN');
  const tailwindScript = document.querySelector('script[src*="tailwindcss"]');
  if (tailwindScript) {
    console.log('%c✅ Tailwind CDN 로드됨', 'color: #00ff00');
    console.log('Source:', tailwindScript.src);
  } else {
    console.error('❌ Tailwind CDN 스크립트를 찾을 수 없습니다!');
  }
  console.groupEnd();
  
  // 2. Tailwind Config 확인
  console.group('2️⃣ Tailwind Config');
  if (window.tailwind) {
    console.log('%c✅ Config 존재', 'color: #00ff00');
    console.log('Colors:', window.tailwind.config?.theme?.extend?.colors);
  } else {
    console.error('❌ Tailwind config가 정의되지 않았습니다!');
  }
  console.groupEnd();
  
  // 3. 모든 Stylesheet 확인
  console.group('3️⃣ Loaded Stylesheets');
  const sheets = Array.from(document.styleSheets);
  sheets.forEach((sheet, i) => {
    try {
      console.log(`${i + 1}. ${sheet.href || 'inline'} - ${sheet.cssRules?.length || 0} rules`);
    } catch (e) {
      console.log(`${i + 1}. ${sheet.href || 'inline'} - CORS blocked`);
    }
  });
  console.groupEnd();
  
  // 4. Tailwind 클래스 테스트
  console.group('4️⃣ Tailwind Class Tests');
  
  const tests = [
    { name: 'Flexbox', classes: 'flex items-center justify-center', checks: [
      { prop: 'display', expected: 'flex' },
      { prop: 'alignItems', expected: 'center' },
      { prop: 'justifyContent', expected: 'center' }
    ]},
    { name: 'Grid', classes: 'grid grid-cols-3', checks: [
      { prop: 'display', expected: 'grid' }
    ]},
    { name: 'Spacing', classes: 'p-6 m-4', checks: [
      { prop: 'padding', expected: '24px' },
      { prop: 'margin', expected: '16px' }
    ]},
    { name: 'Colors', classes: 'bg-red-500 text-white', checks: [
      { prop: 'backgroundColor', contains: 'rgb' },
      { prop: 'color', contains: 'rgb' }
    ]},
    { name: 'Custom Colors', classes: 'bg-secondary text-accent', checks: [
      { prop: 'backgroundColor', contains: 'rgb' },
      { prop: 'color', contains: 'rgb' }
    ]},
    { name: 'Border', classes: 'border-2 border-pink-500 rounded-xl', checks: [
      { prop: 'borderWidth', expected: '2px' },
      { prop: 'borderRadius', contains: 'px' }
    ]}
  ];
  
  tests.forEach(test => {
    const div = document.createElement('div');
    div.className = test.classes;
    div.style.position = 'absolute';
    div.style.top = '-9999px';
    document.body.appendChild(div);
    
    const computed = window.getComputedStyle(div);
    
    console.group(`${test.name} (${test.classes})`);
    let allPassed = true;
    
    test.checks.forEach(check => {
      const value = computed[check.prop];
      let passed = false;
      
      if (check.expected) {
        passed = value === check.expected;
      } else if (check.contains) {
        passed = value.includes(check.contains);
      }
      
      if (passed) {
        console.log(`%c✅ ${check.prop}: ${value}`, 'color: #00ff00');
      } else {
        console.error(`❌ ${check.prop}: ${value} (expected: ${check.expected || 'contains ' + check.contains})`);
        allPassed = false;
      }
    });
    
    if (!allPassed) {
      console.log('%cFull computed style:', 'color: #fec260');
      console.log(computed);
    }
    
    console.groupEnd();
    document.body.removeChild(div);
  });
  
  console.groupEnd();
  
  // 5. 실제 DOM 요소 확인
  console.group('5️⃣ DOM Elements with Tailwind Classes');
  const elementsWithClasses = document.querySelectorAll('[class*="flex"], [class*="grid"], [class*="bg-"]');
  console.log(`Found ${elementsWithClasses.length} elements with Tailwind classes`);
  
  if (elementsWithClasses.length > 0) {
    const sample = elementsWithClasses[0];
    console.log('Sample element:', sample);
    console.log('Classes:', sample.className);
    console.log('Computed style:', window.getComputedStyle(sample));
  }
  console.groupEnd();
  
  // 6. 콘솔 에러 체크
  console.group('6️⃣ Console Errors');
  const originalError = console.error;
  const errors = [];
  
  console.error = function(...args) {
    errors.push(args);
    originalError.apply(console, args);
  };
  
  setTimeout(() => {
    if (errors.length > 0) {
      console.error(`Found ${errors.length} errors:`, errors);
    } else {
      console.log('%c✅ No console errors', 'color: #00ff00');
    }
    console.error = originalError;
  }, 1000);
  console.groupEnd();
  
  // 7. Network 확인
  console.group('7️⃣ Network Resources');
  if (performance && performance.getEntriesByType) {
    const resources = performance.getEntriesByType('resource');
    const tailwindResource = resources.find(r => r.name.includes('tailwindcss'));
    
    if (tailwindResource) {
      console.log('%c✅ Tailwind CDN loaded successfully', 'color: #00ff00');
      console.log('Duration:', tailwindResource.duration + 'ms');
      console.log('Size:', tailwindResource.transferSize, 'bytes');
    } else {
      console.error('❌ Tailwind CDN not found in network resources');
    }
  }
  console.groupEnd();
  
  // 요약
  console.log('');
  console.log('%c📊 SUMMARY', 'font-size: 16px; color: #c96dfd; font-weight: bold;');
  console.log('- Tailwind CDN:', tailwindScript ? '✅' : '❌');
  console.log('- Config:', window.tailwind ? '✅' : '❌');
  console.log('- Stylesheets:', sheets.length);
  console.log('- Elements:', elementsWithClasses.length);
  
  console.log('');
  console.log('%c💡 NEXT STEPS', 'font-size: 16px; color: #fec260; font-weight: bold;');
  console.log('1. Check the test results above');
  console.log('2. If Tailwind CDN is ❌, check your internet connection');
  console.log('3. If tests fail, try clearing cache (Ctrl+Shift+Del)');
  console.log('4. Check the Network tab for failed requests');
  console.log('5. Open debug.html in your browser for visual tests');
  
  return {
    tailwindLoaded: !!tailwindScript,
    configExists: !!window.tailwind,
    stylesheetsCount: sheets.length,
    elementsCount: elementsWithClasses.length
  };
};

// 자동 실행
console.log('%c💡 TIP: Type window.debugCSS() in console to run diagnostics', 'color: #fec260; font-size: 14px;');
console.log('%c💡 TIP: Or just wait 2 seconds for auto-run...', 'color: #fec260; font-size: 14px;');

// 2초 후 자동 실행
setTimeout(() => {
  console.log('%c🚀 Auto-running diagnostics...', 'color: #ff6b9d; font-size: 14px;');
  window.debugCSS();
}, 2000);
