# [문서] React Native vs React — 모바일 크로스플랫폼 (프론트 면접 대비)
> React 지식을 모바일로. 렌더링 대상만 DOM→네이티브 뷰로 바뀌고, 컴포넌트·JSX·Hooks는 그대로.
> 앞선 문서: React/Next 핵심 사전(46), 인증·프론트 기본(26).

---

## 1. React Native와 React의 근본 차이
정의: React Native(RN)=React로 iOS/Android 네이티브 앱을 만드는 프레임워크. React=웹 UI 라이브러리(브라우저 DOM 렌더).
- ★ 렌더링 대상이 다름: React는 컴포넌트를 **DOM 요소**로 그림(브라우저). RN은 **진짜 네이티브 뷰**로 그림(iOS=UIView, Android=View). 웹뷰(HTML 껍데기) 아님.
- 공통(그대로 재사용): 컴포넌트 모델·JSX·Hooks(useState/useEffect…)·단방향 데이터 흐름·상태관리(Redux/Zustand·React Query). "React를 알면 로직·구조는 똑같다."
- 다른 것: 태그 셋(div 대신 View 등), 스타일(CSS 대신 StyleSheet), 라우팅 대신 네비게이션, 브라우저 API 대신 네이티브 API.
- 브리지/JSI: JS 스레드와 네이티브(UI) 스레드가 분리돼 서로 통신해야 함.
  - (구) Bridge: JS↔네이티브를 **비동기 JSON 직렬화**로 주고받음 → 대량 통신 시 병목.
  - (신) New Architecture: **JSI**(JavaScript Interface)로 C++ 레벨 직접 호출(직렬화 제거), 렌더러 **Fabric**, 네이티브 모듈 지연 로딩 **TurboModules**. 브리지 병목 개선.

## 2. 태그(엘리먼트)가 다른 점 — HTML 태그가 없다
★ RN엔 div/span/p/img/a 같은 HTML 태그가 **없음**. 이유: 브라우저 DOM이 아니라 네이티브 뷰에 매핑되므로, RN이 제공하는 코어 컴포넌트만 씀.

| 웹(React) | React Native | 비고 |
|---|---|---|
| `<div>` | `<View>` | 레이아웃 컨테이너(기본 Flexbox) |
| 텍스트(그냥 문자) | `<Text>` | ★ 모든 글자는 반드시 `<Text>` 안에. View에 raw 텍스트 넣으면 에러 |
| `<img>` | `<Image>` | `source={{uri}}` 또는 require. width/height 지정 권장 |
| `<a>` | `<Pressable>`+`Linking` | 화면 이동=네비게이션, 외부 링크=`Linking.openURL` |
| `<input>` | `<TextInput>` | value+onChangeText로 제어 |
| `<button>` | `<Button>` / `<Pressable>` | Button은 스타일 제약 큼 → 보통 Pressable 커스텀 |
| 스크롤(자동) | `<ScrollView>`/`<FlatList>` | 네이티브는 스크롤을 명시적 컴포넌트로 |

```jsx
// 웹                              // React Native
<div><p>Hello</p></div>    →    <View><Text>Hello</Text></View>
```

## 3. 모바일 특유의 컨트롤 컴포넌트
- `<Pressable>` / `<TouchableOpacity>`: 터치 가능 영역. TouchableOpacity는 누르면 투명도↓(피드백). Pressable이 최신·유연.
- `<ScrollView>`: 스크롤 컨테이너. **자식을 한 번에 전부 렌더** → 항목 적고 내용 고정일 때(설정 화면 등).
- `<FlatList>`: **가상화 리스트**. 화면에 보이는 항목만 렌더+재활용(windowing) → 길거나 무한한 리스트. data+renderItem+keyExtractor.
- `<SectionList>`: 섹션 헤더가 있는 FlatList(연락처 A·B·C 그룹 등).
- `<TextInput>`: 입력창. keyboardType·secureTextEntry·onChangeText.
- `<Modal>`: 네이티브 모달 오버레이. `<ActivityIndicator>`: 로딩 스피너.
- `<SafeAreaView>`: 노치·상태바·홈 인디케이터를 피해 안전 영역에 렌더.
- `<StatusBar>`: 상단 상태바 스타일 제어. `<Switch>`: on/off 토글.
- `<RefreshControl>`: 당겨서 새로고침(pull-to-refresh). ScrollView/FlatList에 부착.
- `<KeyboardAvoidingView>`: 키보드가 올라올 때 입력창이 가리지 않게 화면을 밀어 올림.

★ ScrollView vs FlatList (면접 빈출):
- ScrollView=자식 전부를 즉시 렌더 → 항목 많으면 메모리·초기 렌더 폭증(느려짐).
- FlatList=보이는 만큼만 렌더+스크롤 시 재활용 → 대량/무한 데이터의 정답.
- 기준: **개수 적고 고정** = ScrollView, **길다/동적/무한 스크롤** = FlatList.

## 4. 지원 기능 / 생태계
- 네이티브 API 접근: 카메라·위치(GPS)·푸시 알림·연락처·센서 등. 코어에 없는 건 커뮤니티 라이브러리(react-native-*)나 Expo 모듈로.
- 스타일링(CSS와 차이):
  - `StyleSheet.create({...})`로 정의, `style={styles.box}` 또는 배열로 병합. **className 없음**.
  - 레이아웃은 **Flexbox 기본** — 단, `flexDirection` 기본값이 웹의 `row`가 아니라 **`column`**(세로).
  - **단위 없음**: 숫자=밀도 독립 픽셀(dp). `px`/`%`/`em` 문자열 아님(일부 %만 허용).
  - CSS의 일부만 지원(그림자·transform 등은 방식이 다름), 전역 스타일·상속(cascade)·미디어쿼리 없음.
  ```jsx
  const styles = StyleSheet.create({
    box: { flex: 1, flexDirection: 'row', padding: 16, backgroundColor: '#fff' },
  });
  ```
- 네비게이션: 브라우저 URL 라우터가 없으므로 **React Navigation**(사실상 표준). Stack/Tab/Drawer 네비게이터로 화면 전환. (Expo Router는 파일 기반 대안.)
- 워크플로: **Expo**(설정·빌드·네이티브 API를 감싼 편한 툴체인, 빠른 시작) vs **Bare**(네이티브 프로젝트 직접 관리, 세밀한 제어). 초기엔 Expo, 깊은 네이티브 커스텀 필요 시 Bare.
- 플랫폼 분기: `Platform.OS === 'ios'`로 분기, 또는 `Component.ios.tsx`/`Component.android.tsx` 파일 분리(빌드 시 자동 선택).

## 5. React Native 장점
- 크로스플랫폼: 하나의 코드베이스로 iOS·Android 동시 대응(코드 공유율 높음).
- React 지식 재사용: 컴포넌트·Hooks·상태관리 그대로 → 웹 팀의 학습 곡선 완만.
- 빠른 개발: Fast Refresh(핫 리로드)로 저장 즉시 반영.
- OTA 업데이트: JS 번들을 앱스토어 심사 없이 갱신(Expo EAS Update, CodePush 등) → 버그 핫픽스 빠름.
- 네이티브 뷰 렌더라 웹뷰 방식보다 성능·UX가 네이티브에 근접.
- 크고 성숙한 생태계·커뮤니티.

## 6. React Native 단점
- 순수 네이티브 대비 성능 한계: 무거운 애니메이션·그래픽·게임 등 고부하 작업엔 부적합.
- 브리지 병목: 구 아키텍처는 JS↔네이티브 직렬화가 오버헤드(신 아키텍처 JSI/Fabric로 개선 중이나 전환 과도기).
- 네이티브 모듈 필요 시 복잡: 코어에 없는 기능은 네이티브(Swift/Kotlin) 코드·라이브러리 의존 → 유지보수 부담.
- 버전 업그레이드 고통: RN·네이티브 의존성 버전 충돌이 잦아 업그레이드가 까다로움.
- 플랫폼별 차이: iOS·Android의 미세한 동작·UI 차이로 별도 대응·디버깅 필요.
- 브라우저가 아님: DOM·웹 API·기존 웹 CSS 자산을 그대로 재사용 못 함(웹 공유는 React Native for Web 별도).

## 핵심 요약
RN=React로 네이티브 앱. 컴포넌트·JSX·Hooks·상태관리는 React와 동일, **렌더링 대상만 DOM→네이티브 뷰**. HTML 태그 대신 View/Text/Image/TextInput 등 코어 컴포넌트, 리스트는 대량이면 FlatList(가상화)·소량이면 ScrollView. 스타일은 StyleSheet+Flexbox(기본 column·단위 없음·className 없음), 라우팅 대신 React Navigation, 워크플로는 Expo/Bare. 장점=크로스플랫폼·React 재사용·OTA·핫리로드, 단점=고부하 성능 한계·브리지 병목(JSI/Fabric로 개선)·네이티브 모듈 복잡·업그레이드 고통.

## 면접 빈출 한 줄 답
- "RN과 React 차이?" → 로직·컴포넌트 모델은 같고, 렌더링 대상이 DOM이 아니라 네이티브 뷰. 웹뷰가 아니라 진짜 네이티브 UI.
- "왜 HTML 태그를 못 쓰나?" → 브라우저 DOM이 아니라 네이티브 뷰에 매핑되기 때문. div→View, 텍스트는 반드시 Text 안에.
- "ScrollView vs FlatList?" → 항목 적고 고정이면 ScrollView(전부 렌더), 길거나 무한이면 FlatList(보이는 것만 가상화 렌더).
- "브리지가 뭔가?" → JS 스레드와 네이티브 스레드의 통신 계층. 구조는 비동기 직렬화(병목), 신 아키텍처는 JSI로 직접 호출.
- "RN 스타일이 CSS와 다른 점?" → StyleSheet+Flexbox, flexDirection 기본 column, 단위 없음(dp), className·cascade 없음.
- "RN 단점?" → 고부하 그래픽 성능 한계, 네이티브 모듈 필요 시 복잡, 버전 업그레이드·플랫폼 차이 대응 비용.
