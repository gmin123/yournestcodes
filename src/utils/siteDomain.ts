// 하나의 코드베이스를 두 도메인에 배포 - 접속 도메인에 따라 첫 화면과 화면별 도메인을 구분함
// - MeM    : mem-memory 호스팅 (mem-memory.web.app / mem-memory.firebaseapp.com) → 첫 화면 /mem
// - Rheina : 그 외 (yournest-today-d2a73.web.app 등)                              → 첫 화면 / (감정 기반 작품 추천)
// 데이터·로그인은 두 도메인 모두 기존 yournest-today Firebase 프로젝트를 그대로 사용 (src/firebase.ts)
const MEM_HOSTNAMES = ['mem-memory.web.app', 'mem-memory.firebaseapp.com'];
const RHEINA_HOSTNAMES = ['yournest-today-d2a73.web.app', 'yournest-today-d2a73.firebaseapp.com'];

export function isMemDomain(hostname: string = window.location.hostname): boolean {
  return MEM_HOSTNAMES.includes(hostname);
}

// localhost 등 개발 환경은 어느 쪽에도 속하지 않아 도메인 이동 없이 한 곳에서 모든 화면을 볼 수 있음
function isRheinaDomain(hostname: string = window.location.hostname): boolean {
  return RHEINA_HOSTNAMES.includes(hostname);
}

// 앱 첫 로드(새로고침·직접 URL 접근 포함) 시 한 번만 호출. MeM 도메인의 루트(/)로 들어오면 /mem 으로 바꿔줌.
// 라우트 자체를 바꾸지 않는 이유: 앱 안의 '/' 링크(오늘의 마음 남기기, 처음으로 등)는 Rheina 흐름을 가리키므로 그대로 둬야 함
export function applyDomainEntryRoute(): void {
  if (!isMemDomain()) return;
  const { pathname, search, hash } = window.location;
  if (pathname === '/' || pathname === '') {
    window.history.replaceState(null, '', `/mem${search}${hash}`);
  }
}

// MeM 도메인에서 Rheina 감정 여정(첫 화면·감정 태그 선택·결과)으로 가면 Rheina 도메인으로,
// Rheina 도메인에서 MeM 으로 가면 MeM 도메인으로 넘김
const RHEINA_ORIGIN = 'https://yournest-today-d2a73.web.app';
const MEM_ORIGIN = 'https://mem-memory.web.app';
const RHEINA_JOURNEY_PATHS = ['/', '/emotion', '/result'];
const MEM_PATHS = ['/mem', '/calendar'];

export function crossSiteUrl(pathname: string, search = ''): string | null {
  if (isMemDomain() && RHEINA_JOURNEY_PATHS.includes(pathname)) return `${RHEINA_ORIGIN}${pathname}${search}`;
  if (isRheinaDomain() && MEM_PATHS.includes(pathname)) return `${MEM_ORIGIN}/mem${search}`;
  return null;
}

// 로그인 후 / 로그아웃 후 기본으로 돌아갈 화면 (MeM 도메인은 MeM, 그 외는 Rheina 첫 화면)
export function siteHomePath(): string {
  return isMemDomain() ? '/mem' : '/';
}
