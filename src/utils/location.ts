export interface LocationData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  weather: string;
  temperature: number;
  weatherCode: number; // 🔥 추가: 날씨 코드
  weatherIsFallback?: boolean; // 날씨 API 실패로 임시값('맑음')이 들어간 경우 - 기록에는 저장하지 않음
  time: string;
  date: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

// WeatherAPI.com API Key
const WEATHER_API_KEY = '99da4188aaf34c43a81183135251911';

// City name translation map (English to Korean)
const CITY_TRANSLATION: Record<string, string> = {
  // 한국 주요 도시
  'Seoul': '서울',
  'Busan': '부산',
  'Incheon': '인천',
  'Daegu': '대구',
  'Daejeon': '대전',
  'Gwangju': '광주',
  'Ulsan': '울산',
  'Suwon': '수원',
  'Goyang': '고양',
  'Seongnam': '성남',
  'Yongin': '용인',
  'Bucheon': '부천',
  'Ansan': '안산',
  'Changwon': '창원',
  'Anyang': '안양',
  'Jeonju': '전주',
  'Cheonan': '천안',
  'Pohang': '포항',
  'Gimhae': '김해',
  'Jeju': '제주',
  
  // 한국 지역 (도/시/군/구)
  'Gyeonggi-do': '경기도',
  'Gyeonggi': '경기',
  'Gangnam-gu': '강남구',
  'Gangnam': '강남',
  'Gangdong-gu': '강동구',
  'Gangbuk-gu': '강북구',
  'Gangseo-gu': '강서구',
  'Gwanak-gu': '관악구',
  'Gwangjin-gu': '광진구',
  'Guro-gu': '구로구',
  'Geumcheon-gu': '금천구',
  'Nowon-gu': '노원구',
  'Dobong-gu': '도봉구',
  'Dongdaemun-gu': '동대문구',
  'Dongjak-gu': '동작구',
  'Mapo-gu': '마포구',
  'Seodaemun-gu': '서대문구',
  'Seocho-gu': '서초구',
  'Seongdong-gu': '성동구',
  'Seongbuk-gu': '성북구',
  'Songpa-gu': '송파구',
  'Yangcheon-gu': '양천구',
  'Yeongdeungpo-gu': '영등포구',
  'Yongsan-gu': '용산구',
  'Eunpyeong-gu': '은평구',
  'Jongno-gu': '종로구',
  'Jung-gu': '중구',
  'Jungnang-gu': '중랑구',
  
  // 경기도 주요 시
  'Hwaseong': '화성',
  'Namyangju': '남양주',
  'Paju': '파주',
  'Siheung': '시흥',
  'Gimpo': '김포',
  'Gwangmyeong': '광명',
  'Gunpo': '군포',
  'Osan': '오산',
  'Icheon': '이천',
  'Yangju': '양주',
  'Uijeongbu': '의정부',
  'Pyeongtaek': '평택',
  'Hanam': '하남',
  
  // 일본
  'Tokyo': '도쿄',
  'Osaka': '오사카',
  'Kyoto': '교토',
  'Yokohama': '요코하마',
  'Nagoya': '나고야',
  'Sapporo': '삿포로',
  'Fukuoka': '후쿠오카',
  
  // 중국
  'Beijing': '베이징',
  'Shanghai': '상하이',
  'Guangzhou': '광저우',
  'Shenzhen': '심천',
  'Chengdu': '청두',
  'Wuhan': '우한',
  
  // 동남아시아
  'Hong Kong': '홍콩',
  'Taipei': '타이베이',
  'Singapore': '싱가포르',
  'Bangkok': '방콕',
  'Hanoi': '하노이',
  'Ho Chi Minh City': '호찌민',
  'Manila': '마닐라',
  'Kuala Lumpur': '쿠알라룸푸르',
  'Jakarta': '자카르타',
  
  // 미국
  'New York': '뉴욕',
  'Los Angeles': '로스앤젤레스',
  'San Francisco': '샌프란시스코',
  'Chicago': '시카고',
  'Seattle': '시애틀',
  'Boston': '보스턴',
  'Las Vegas': '라스베이거스',
  
  // 유럽
  'London': '런던',
  'Paris': '파리',
  'Berlin': '베를린',
  'Rome': '로마',
  'Madrid': '마드리드',
  'Barcelona': '바르셀로나',
  'Amsterdam': '암스테르담',
  'Vienna': '비엔나',
  'Prague': '프라하',
  'Zurich': '취리히',
  
  // 오세아니아
  'Sydney': '시드니',
  'Melbourne': '멜버른',
  'Brisbane': '브리즈번',
  'Auckland': '오클랜드',
};

// Country name translation map (English to Korean)
const COUNTRY_TRANSLATION: Record<string, string> = {
  'South Korea': '대한민국',
  'Korea': '대한민국',
  'Japan': '일본',
  'China': '중국',
  'Taiwan': '대만',
  'Hong Kong': '홍콩',
  'Singapore': '싱가포르',
  'Thailand': '태국',
  'Vietnam': '베트남',
  'Philippines': '필리핀',
  'Malaysia': '말레이시아',
  'Indonesia': '인도네시아',
  'United States': '미국',
  'United Kingdom': '영국',
  'France': '프랑스',
  'Germany': '독일',
  'Italy': '이탈리아',
  'Spain': '스페인',
  'Netherlands': '네덜란드',
  'Australia': '호주',
  'Canada': '캐나다',
};

// Translate city and country names to Korean
function translateLocation(city: string, country: string) {
  return {
    city: CITY_TRANSLATION[city] || city,
    country: COUNTRY_TRANSLATION[country] || country,
  };
}

// Get current time and date
function getTimeData() {
  const now = new Date();
  const hour = now.getHours();
  
  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';

  return {
    time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    date: now.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    }),
    timeOfDay,
  };
}

// Get weather from coordinates using WeatherAPI.com
async function getWeather(lat: number, lon: number) {
  try {
    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&lang=ko&aqi=no`
    );
    const data = await response.json();
    
    return {
      weather: data.current.condition.text,
      temperature: Math.round(data.current.temp_c),
      weatherCode: data.current.condition.code, // 🔥 추가: 날씨 코드
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return {
      weather: '맑음',
      temperature: 20,
      weatherCode: 1000, // 🔥 추가: 날씨 코드
      weatherIsFallback: true,
    };
  }
}

// 좌표 → 한국어 시/도 이름 (Nominatim, accept-language=ko 우선)
// GPS든 IP 위치든 좌표만 있으면 이 함수로 통일해서 한국어 지명을 받는다.
// (IP 위치 서비스가 자체적으로 돌려주는 city 필드는 로마자 표기라 번역표만으로는 못 잡는 경우가 많음)
async function reverseGeocodeKorean(lat: number, lon: number): Promise<{ city: string; country: string }> {
  try {
    const geoResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ko,en`
    );
    const geoData = await geoResponse.json();

    const address = geoData.address ?? {};
    const rawCity = address.city || address.town || address.village ||
                   address.county || address.state || '서울';
    const rawCountry = address.country || 'South Korea';
    // 구/군 단위 - 서울/광역시는 borough(구), 그 외 지역은 county(군/구)에 들어오는 경우가 있음
    const district: string = address.borough || address.city_district || address.district || '';

    console.log('🌍 위치 원본:', rawCity, district, rawCountry);

    // 이미 한국어로 내려온 경우 그대로 사용, 영어로 내려온 경우(해외 등)는 번역 맵으로 보정
    const translated = translateLocation(rawCity, rawCountry);

    // "시/도 + 구" 형태로 합침 (구 정보가 없거나 이미 포함돼 있으면 그대로)
    const cityWithDistrict =
      district && !translated.city.includes(district) ? `${translated.city} ${district}`.trim() : translated.city;

    console.log('🇰🇷 최종 위치:', cityWithDistrict, translated.country);
    return { city: cityWithDistrict, country: translated.country };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return { city: '서울', country: '대한민국' };
  }
}

// Try GPS first, fallback to IP-based location
export async function getLocationData(): Promise<LocationData> {
  const timeData = getTimeData();

  // Try GPS first
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, // Wi-Fi/기지국 기반 대략적 위치 대신 실제 GPS 정밀 위치 우선
        timeout: 10000, // GPS 정밀 위치는 잡히는 데 시간이 더 걸릴 수 있어 여유를 둠
        maximumAge: 60000, // 1분 - 너무 오래된 캐시 위치를 재사용하지 않도록
      });
    });

    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    // Get city name from coordinates using reverse geocoding (한국어 우선)
    const { city, country } = await reverseGeocodeKorean(lat, lon);

    // Get weather
    const weatherData = await getWeather(lat, lon);

    return {
      city,
      country,
      latitude: lat,
      longitude: lon,
      ...weatherData,
      ...timeData,
    };
  } catch (gpsError) {
    // code: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
    const err = gpsError as GeolocationPositionError;
    console.warn('GPS 위치를 못 가져와서 IP 기반으로 대체합니다. code:', err?.code, 'message:', err?.message);

    // Fallback to IP-based location
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();

      const lat = data.latitude;
      const lon = data.longitude;

      // ipapi.co가 주는 city는 로마자 표기(예: "Seongnam-si")라 번역표만으론 못 잡는 경우가 많음
      // → 좌표만 받아서 같은 한국어 역지오코딩으로 통일
      const { city, country } = await reverseGeocodeKorean(lat, lon);

      const weatherData = await getWeather(lat, lon);

      return {
        city,
        country,
        latitude: lat,
        longitude: lon,
        ...weatherData,
        ...timeData,
      };
    } catch (ipError) {
      console.error('IP location error:', ipError);
      
      // Ultimate fallback - Seoul default
      return {
        city: '서울',
        country: '대한민국',
        latitude: 37.5665,
        longitude: 126.9780,
        weather: '맑음',
        temperature: 20,
        weatherCode: 1000, // 🔥 추가: 날씨 코드
        weatherIsFallback: true,
        ...timeData,
      };
    }
  }
}