import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const MENU_KEY = "qrorder.menu.v3";
const ORDER_KEY = "qrorder.orders.v3";
const ACTIVE_ORDER_PREFIX = "qrorder.activeOrder.v3";
const LANG_KEY = "qrorder.language.v1";
const ACCESS_KEY = "qrorder.access.v1";
const PAYMENT_KEY = "qrorder.payment.v1";
const SYNC_CHANNEL = "qrorder.sync.v1";
const SELECTED_STORE_KEY = "qrorder.selectedStore.v1";
const QR_CODE_CDN = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js";

const firebaseConfig = {
  apiKey: "AIzaSyCRDZfNLzoruz2NhMhrfk4p3E_AxQDSrR0",
  authDomain: "qrorder-5a729.firebaseapp.com",
  projectId: "qrorder-5a729",
  storageBucket: "qrorder-5a729.firebasestorage.app",
  messagingSenderId: "972435696772",
  appId: "1:972435696772:web:d3c47a275455539a1726d1",
  measurementId: "G-9Y5NLC9D51",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
let qrLibraryPromise = null;

const realtimeChannel = "BroadcastChannel" in window ? new BroadcastChannel(SYNC_CHANNEL) : null;

const formatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const translations = {
  ko: {
    menu: "메뉴",
    qrOrder: "QR 주문",
    searchLabel: "메뉴 검색",
    searchPlaceholder: "삼겹살, 찌개, 음료 검색",
    add: "담기",
    option: "옵션",
    detailAdd: "선택해서 담기",
    cart: "장바구니",
    orderReview: "주문 확인",
    request: "요청사항",
    requestPlaceholder: "예: 덜 맵게 해주세요",
    orderNow: "후불 주문 접수",
    policy: "주문/환불 안내",
    languageReady: "한국어 메뉴 표시",
    defaultView: "기본 보기",
    largeText: "큰 글씨",
    largeTextOn: "큰 글씨 적용",
    categoryAll: "전체",
    categoryMain: "메인",
    categorySide: "사이드",
    categoryDrink: "음료",
    statusPending: "접수",
    statusCooking: "조리중",
    statusServed: "완료",
    myOrderStatus: "내 주문 현황",
    currentOrderDefault: "진행 중인 주문",
    orderNo: "주문번호",
    serviceCall: "직원 호출",
    serviceWater: "물",
    servicePlate: "앞접시",
    serviceNapkin: "냅킨",
    serviceSent: "{service} 요청을 보냈습니다.",
    emptyCart: "담긴 메뉴가 없습니다.",
    recommendations: "함께 담기 좋은 메뉴",
    soldOut: "품절",
    quickAdd: "빠른 담기",
    noSearchResult: "검색 결과가 없습니다.",
    paymentMode: "결제 안내",
    postpaid: "후불",
    prepaidReady: "후불",
    postpaidHint: "식사 후 카운터 또는 직원에게 결제합니다.",
    prepaidHint: "식사 후 카운터 또는 직원에게 결제합니다.",
    total: "합계",
    orderCompleteEyebrow: "주문 접수 완료",
    completeDefault: "주문이 전송되었습니다.",
    completeTitle: "{table}번 테이블 주문 접수",
    completePostpaid: "합계 {total} 주문이 접수되었습니다. 직원이 확인 후 준비합니다.",
    completePrepaid: "합계 {total} 주문이 접수되었습니다. 식사 후 매장에서 결제합니다.",
    countdown: "{seconds}초 후 주문 화면으로 돌아갑니다.",
    newOrder: "추가 주문하기",
    bottomCount: "{count}개 담김",
    policyBadge: "운영 안내",
    policyTitle: "주문 안내",
    policyBody: "주문 전 장바구니와 옵션을 확인해 주세요. 조리 시작 전에는 직원에게 취소를 요청할 수 있고, 조리 시작 후에는 매장 정책에 따라 처리됩니다.",
    policyPostpaid: "식사 후 카운터 또는 직원에게 결제합니다.",
    policyPrepaid: "식사 후 매장에서 결제합니다.",
    privacy: "개인정보",
    policyPrivacy: "이 데모는 테이블 번호와 주문 내역만 브라우저 저장소에 보관합니다.",
    securityVerifiedTitle: "QR 세션 확인됨",
    securityDemoTitle: "데모 QR 세션",
    tokenVerified: "토큰 검증 통과",
    tokenRecommended: "운영 배포 시 서명 토큰 권장",
    realtimeOn: "실시간 동기화 ON",
    storageSync: "저장소 동기화",
    tableLabel: "{table}번 테이블",
  },
  en: {
    menu: "Menu",
    qrOrder: "QR order",
    searchLabel: "Search menu",
    searchPlaceholder: "Search pork, stew, drinks",
    add: "Add",
    option: "Options",
    detailAdd: "Add selected item",
    cart: "Cart",
    orderReview: "Review order",
    request: "Requests",
    requestPlaceholder: "Ex: Less spicy, please",
    orderNow: "Place order",
    policy: "Order policy",
    languageReady: "English menu mode",
    defaultView: "Default view",
    largeText: "Large text",
    largeTextOn: "Large text on",
    categoryAll: "All",
    categoryMain: "Main",
    categorySide: "Sides",
    categoryDrink: "Drinks",
    statusPending: "Received",
    statusCooking: "Cooking",
    statusServed: "Done",
    myOrderStatus: "My order status",
    currentOrderDefault: "Order in progress",
    orderNo: "Order No.",
    serviceCall: "Call staff",
    serviceWater: "Water",
    servicePlate: "Small plate",
    serviceNapkin: "Napkin",
    serviceSent: "{service} request sent.",
    emptyCart: "Your cart is empty.",
    recommendations: "Pairs well with your order",
    soldOut: "Sold out",
    quickAdd: "Quick add",
    noSearchResult: "No menu found.",
    paymentMode: "Payment guide",
    postpaid: "Pay later",
    prepaidReady: "Pay later",
    postpaidHint: "Pay at the counter or to staff after your meal.",
    prepaidHint: "Pay at the counter or to staff after your meal.",
    total: "Total",
    orderCompleteEyebrow: "Order received",
    completeDefault: "Your order has been sent.",
    completeTitle: "Table {table} order received",
    completePostpaid: "Your {total} order has been received. Staff will confirm and prepare it.",
    completePrepaid: "Your {total} order has been received. Please pay at the store after your meal.",
    countdown: "Returning to the menu in {seconds}s.",
    newOrder: "Order more",
    bottomCount: "{count} items",
    policyBadge: "Store policy",
    policyTitle: "Order Guide",
    policyBody: "Please check your cart and options before ordering. You can ask staff to cancel before cooking starts. After cooking starts, the store policy applies.",
    policyPostpaid: "Pay at the counter or to staff after your meal.",
    policyPrepaid: "Please pay at the store after your meal.",
    privacy: "Privacy",
    policyPrivacy: "This demo stores only table number and order history in browser storage.",
    securityVerifiedTitle: "QR session verified",
    securityDemoTitle: "Demo QR session",
    tokenVerified: "Token verified",
    tokenRecommended: "Signed token recommended for production",
    realtimeOn: "Realtime sync ON",
    storageSync: "Storage sync",
    tableLabel: "Table {table}",
  },
  ja: {
    menu: "メニュー",
    qrOrder: "QR注文",
    searchLabel: "メニュー検索",
    searchPlaceholder: "肉、鍋、ドリンクを検索",
    add: "追加",
    option: "オプション",
    detailAdd: "選んで追加",
    cart: "カート",
    orderReview: "注文確認",
    request: "リクエスト",
    requestPlaceholder: "例: 辛さ控えめ",
    orderNow: "注文する",
    policy: "注文案内",
    languageReady: "日本語メニューモード",
    defaultView: "標準表示",
    largeText: "大きな文字",
    largeTextOn: "大きな文字を適用中",
    categoryAll: "すべて",
    categoryMain: "メイン",
    categorySide: "サイド",
    categoryDrink: "ドリンク",
    statusPending: "受付",
    statusCooking: "調理中",
    statusServed: "完了",
    myOrderStatus: "注文状況",
    currentOrderDefault: "進行中の注文",
    orderNo: "注文番号",
    serviceCall: "スタッフ呼出",
    serviceWater: "水",
    servicePlate: "取り皿",
    serviceNapkin: "ナプキン",
    serviceSent: "{service}をリクエストしました。",
    emptyCart: "カートは空です。",
    recommendations: "一緒におすすめ",
    soldOut: "売切",
    quickAdd: "すぐ追加",
    noSearchResult: "検索結果がありません。",
    paymentMode: "支払い案内",
    postpaid: "後払い",
    prepaidReady: "後払い",
    postpaidHint: "食後にカウンターまたはスタッフへお支払いください。",
    prepaidHint: "食後にカウンターまたはスタッフへお支払いください。",
    total: "合計",
    orderCompleteEyebrow: "注文受付完了",
    completeDefault: "注文が送信されました。",
    completeTitle: "{table}番テーブルの注文受付",
    completePostpaid: "合計{total}の注文を受け付けました。スタッフが確認後、準備します。",
    completePrepaid: "合計{total}の注文を受け付けました。食後に店内でお支払いください。",
    countdown: "{seconds}秒後にメニューへ戻ります。",
    newOrder: "追加注文",
    bottomCount: "{count}点",
    policyBadge: "店舗案内",
    policyTitle: "注文案内",
    policyBody: "注文前にカートとオプションをご確認ください。調理開始前はスタッフにキャンセルを依頼できます。調理開始後は店舗ポリシーに従います。",
    policyPostpaid: "食後にカウンターまたはスタッフへお支払いください。",
    policyPrepaid: "食後に店内でお支払いください。",
    privacy: "個人情報",
    policyPrivacy: "このデモはテーブル番号と注文履歴のみをブラウザ保存します。",
    securityVerifiedTitle: "QRセッション確認済み",
    securityDemoTitle: "デモQRセッション",
    tokenVerified: "トークン確認済み",
    tokenRecommended: "本番では署名トークンを推奨",
    realtimeOn: "リアルタイム同期ON",
    storageSync: "ストレージ同期",
    tableLabel: "{table}番テーブル",
  },
  zh: {
    menu: "菜单",
    qrOrder: "扫码点餐",
    searchLabel: "搜索菜单",
    searchPlaceholder: "搜索烤肉、汤、饮料",
    add: "加入",
    option: "选项",
    detailAdd: "加入所选",
    cart: "购物车",
    orderReview: "确认订单",
    request: "备注",
    requestPlaceholder: "例: 少辣",
    orderNow: "下单",
    policy: "订单说明",
    languageReady: "中文菜单模式",
    defaultView: "默认视图",
    largeText: "大字",
    largeTextOn: "已启用大字",
    categoryAll: "全部",
    categoryMain: "主菜",
    categorySide: "小菜",
    categoryDrink: "饮料",
    statusPending: "已接单",
    statusCooking: "制作中",
    statusServed: "完成",
    myOrderStatus: "我的订单状态",
    currentOrderDefault: "进行中的订单",
    orderNo: "订单号",
    serviceCall: "呼叫店员",
    serviceWater: "水",
    servicePlate: "小盘",
    serviceNapkin: "纸巾",
    serviceSent: "已发送{service}请求。",
    emptyCart: "购物车为空。",
    recommendations: "推荐搭配",
    soldOut: "售罄",
    quickAdd: "快速加入",
    noSearchResult: "没有搜索结果。",
    paymentMode: "付款说明",
    postpaid: "后付",
    prepaidReady: "后付",
    postpaidHint: "用餐后请到柜台或向店员付款。",
    prepaidHint: "用餐后请到柜台或向店员付款。",
    total: "合计",
    orderCompleteEyebrow: "订单已接收",
    completeDefault: "订单已发送。",
    completeTitle: "{table}号桌订单已接收",
    completePostpaid: "已接收合计{total}的订单。店员确认后开始准备。",
    completePrepaid: "已接收合计{total}的订单。用餐后请在店内付款。",
    countdown: "{seconds}秒后返回菜单。",
    newOrder: "继续点餐",
    bottomCount: "{count}件",
    policyBadge: "门店说明",
    policyTitle: "订单说明",
    policyBody: "下单前请确认购物车和选项。开始制作前可向店员申请取消；开始制作后按门店政策处理。",
    policyPostpaid: "用餐后请到柜台或向店员付款。",
    policyPrepaid: "用餐后请在店内付款。",
    privacy: "隐私",
    policyPrivacy: "此演示仅在浏览器存储桌号和订单记录。",
    securityVerifiedTitle: "QR会话已验证",
    securityDemoTitle: "演示QR会话",
    tokenVerified: "令牌验证通过",
    tokenRecommended: "正式部署建议使用签名令牌",
    realtimeOn: "实时同步开启",
    storageSync: "存储同步",
    tableLabel: "{table}号桌",
  },
};

const exactMenuTranslations = {
  "숙성 삼겹살 한판": {
    en: "Aged pork belly platter",
    ja: "熟成サムギョプサル盛り",
    zh: "熟成五花肉拼盘",
  },
  "초벌 숙성 삼겹살, 쌈 채소, 기본 찬": {
    en: "Pre-grilled aged pork belly, lettuce wraps, basic side dishes",
    ja: "下焼きした熟成サムギョプサル、包み野菜、基本のおかず",
    zh: "预烤熟成五花肉、包菜、基础小菜",
  },
  "차돌 된장찌개": {
    en: "Beef brisket soybean paste stew",
    ja: "牛バラ入りテンジャンチゲ",
    zh: "牛胸肉大酱汤",
  },
  "고기 주문과 함께 많이 찾는 국물 메뉴": {
    en: "A popular soup to pair with grilled meat",
    ja: "焼肉と一緒によく選ばれるスープメニュー",
    zh: "烤肉搭配的热门汤品",
  },
  "치즈 계란찜": {
    en: "Cheese steamed egg",
    ja: "チーズ茶碗蒸し",
    zh: "芝士蒸蛋",
  },
  "부드러운 계란찜에 치즈를 올린 사이드": {
    en: "Soft steamed egg topped with cheese",
    ja: "ふんわり卵蒸しにチーズをのせたサイド",
    zh: "柔软蒸蛋上铺芝士的小菜",
  },
  "소주": { en: "Soju", ja: "焼酎", zh: "烧酒" },
  "추가 주문이 잦은 기본 주류": {
    en: "A classic drink often ordered again",
    ja: "追加注文の多い定番のお酒",
    zh: "常被追加点单的经典酒类",
  },
  "콜라": { en: "Cola", ja: "コーラ", zh: "可乐" },
  "탄산음료": { en: "Soft drink", ja: "炭酸飲料", zh: "碳酸饮料" },
};

const menuGlossary = {
  en: {
    "물냉면": "cold buckwheat noodles",
    "비빔냉면": "spicy mixed noodles",
    "김치찌개": "kimchi stew",
    "된장찌개": "soybean paste stew",
    "순두부찌개": "soft tofu stew",
    "부대찌개": "army stew",
    "삼겹살": "pork belly",
    "목살": "pork neck",
    "갈비": "ribs",
    "불고기": "bulgogi",
    "제육볶음": "spicy pork stir-fry",
    "비빔밥": "bibimbap",
    "김밥": "gimbap",
    "떡볶이": "tteokbokki",
    "라면": "ramyeon",
    "계란찜": "steamed egg",
    "치즈": "cheese",
    "공깃밥": "rice",
    "밥": "rice",
    "만두": "dumplings",
    "튀김": "fried snack",
    "파전": "green onion pancake",
    "해물파전": "seafood pancake",
    "닭갈비": "spicy stir-fried chicken",
    "치킨": "chicken",
    "닭": "chicken",
    "맥주": "beer",
    "소주": "soju",
    "막걸리": "makgeolli",
    "사이다": "cider soda",
    "콜라": "cola",
    "커피": "coffee",
    "아메리카노": "americano",
    "라떼": "latte",
    "시원한": "refreshing",
    "물": "water",
    "앞접시": "small plate",
    "냅킨": "napkin",
    "추천": "Recommended",
    "인기": "Popular",
    "요청": "request",
    "기본": "Default",
    "덜 맵게": "Less spicy",
    "맵게": "Spicy",
    "얼음 적게": "Less ice",
    "얼음 많이": "Extra ice",
    "잔 추가": "Extra glass",
    "쌈 채소 추가": "Extra lettuce wraps",
    "치즈 많이": "Extra cheese",
    "파 빼기": "No green onion",
    "차갑게": "Chilled",
    "빨대 필요": "Need straw",
    "덜 익힘": "Less cooked",
    "바싹 익힘": "Well done",
    "앞접시 필요": "Need small plate",
    "공깃밥 추가": "Add rice",
    "새 메뉴": "New menu",
  },
  ja: {
    "물냉면": "水冷麺",
    "비빔냉면": "ビビン冷麺",
    "김치찌개": "キムチチゲ",
    "된장찌개": "テンジャンチゲ",
    "순두부찌개": "スンドゥブチゲ",
    "부대찌개": "プデチゲ",
    "삼겹살": "サムギョプサル",
    "목살": "豚肩ロース",
    "갈비": "カルビ",
    "불고기": "プルコギ",
    "제육볶음": "豚肉辛炒め",
    "비빔밥": "ビビンバ",
    "김밥": "キンパ",
    "떡볶이": "トッポッキ",
    "라면": "ラーメン",
    "계란찜": "卵蒸し",
    "치즈": "チーズ",
    "공깃밥": "ライス",
    "밥": "ご飯",
    "만두": "餃子",
    "튀김": "揚げ物",
    "파전": "ねぎチヂミ",
    "해물파전": "海鮮チヂミ",
    "닭갈비": "タッカルビ",
    "치킨": "チキン",
    "닭": "鶏",
    "맥주": "ビール",
    "소주": "焼酎",
    "막걸리": "マッコリ",
    "사이다": "サイダー",
    "콜라": "コーラ",
    "커피": "コーヒー",
    "아메리카노": "アメリカーノ",
    "라떼": "ラテ",
    "시원한": "冷たい",
    "물": "水",
    "앞접시": "取り皿",
    "냅킨": "ナプキン",
    "추천": "おすすめ",
    "인기": "人気",
    "요청": "リクエスト",
    "기본": "基本",
    "덜 맵게": "辛さ控えめ",
    "맵게": "辛く",
    "얼음 적게": "氷少なめ",
    "얼음 많이": "氷多め",
    "잔 추가": "グラス追加",
    "쌈 채소 추가": "包み野菜追加",
    "치즈 많이": "チーズ多め",
    "파 빼기": "ねぎ抜き",
    "차갑게": "冷たく",
    "빨대 필요": "ストロー必要",
    "덜 익힘": "軽めに焼く",
    "바싹 익힘": "しっかり焼く",
    "앞접시 필요": "取り皿必要",
    "공깃밥 추가": "ライス追加",
    "새 메뉴": "新メニュー",
  },
  zh: {
    "물냉면": "冷面",
    "비빔냉면": "拌冷面",
    "김치찌개": "泡菜汤",
    "된장찌개": "大酱汤",
    "순두부찌개": "嫩豆腐汤",
    "부대찌개": "部队锅",
    "삼겹살": "五花肉",
    "목살": "猪颈肉",
    "갈비": "排骨",
    "불고기": "烤肉",
    "제육볶음": "辣炒猪肉",
    "비빔밥": "拌饭",
    "김밥": "紫菜包饭",
    "떡볶이": "炒年糕",
    "라면": "拉面",
    "계란찜": "蒸蛋",
    "치즈": "芝士",
    "공깃밥": "米饭",
    "밥": "米饭",
    "만두": "饺子",
    "튀김": "炸物",
    "파전": "葱饼",
    "해물파전": "海鲜葱饼",
    "닭갈비": "辣炒鸡排",
    "치킨": "炸鸡",
    "닭": "鸡",
    "맥주": "啤酒",
    "소주": "烧酒",
    "막걸리": "米酒",
    "사이다": "汽水",
    "콜라": "可乐",
    "커피": "咖啡",
    "아메리카노": "美式咖啡",
    "라떼": "拿铁",
    "시원한": "清爽的",
    "물": "水",
    "앞접시": "小盘",
    "냅킨": "纸巾",
    "추천": "推荐",
    "인기": "热门",
    "요청": "请求",
    "기본": "默认",
    "덜 맵게": "少辣",
    "맵게": "辣",
    "얼음 적게": "少冰",
    "얼음 많이": "多冰",
    "잔 추가": "加杯子",
    "쌈 채소 추가": "加包菜",
    "치즈 많이": "多芝士",
    "파 빼기": "不要葱",
    "차갑게": "冰镇",
    "빨대 필요": "需要吸管",
    "덜 익힘": "少烤",
    "바싹 익힘": "全熟",
    "앞접시 필요": "需要小盘",
    "공깃밥 추가": "加米饭",
    "새 메뉴": "新菜品",
  },
};

const defaultMenu = [
  {
    id: "pork-set",
    category: "main",
    name: "숙성 삼겹살 한판",
    desc: "초벌 숙성 삼겹살, 쌈 채소, 기본 찬",
    price: 17000,
    image: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=640&q=80",
    badge: "인기",
    options: ["기본", "덜 익힘", "바싹 익힘", "쌈 채소 추가"],
    soldOut: false,
  },
  {
    id: "stew",
    category: "side",
    name: "차돌 된장찌개",
    desc: "고기 주문과 함께 많이 찾는 국물 메뉴",
    price: 8000,
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=640&q=80",
    badge: "추천",
    options: ["기본", "덜 맵게", "맵게", "공깃밥 추가"],
    soldOut: false,
  },
  {
    id: "egg",
    category: "side",
    name: "치즈 계란찜",
    desc: "부드러운 계란찜에 치즈를 올린 사이드",
    price: 6500,
    image: "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=640&q=80",
    badge: "",
    options: ["기본", "치즈 많이", "파 빼기", "아이용"],
    soldOut: true,
  },
  {
    id: "soju",
    category: "drink",
    name: "소주",
    desc: "추가 주문이 잦은 기본 주류",
    price: 5000,
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=640&q=80",
    badge: "",
    options: ["기본", "차갑게", "잔 추가"],
    soldOut: false,
  },
  {
    id: "cola",
    category: "drink",
    name: "콜라",
    desc: "탄산음료",
    price: 2500,
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=640&q=80",
    badge: "",
    options: ["기본", "얼음 적게", "얼음 많이", "빨대 필요"],
    soldOut: false,
  },
];

const state = {
  menu: loadMenu(),
  orders: loadOrders(),
  qrSessions: [],
  cart: [],
  activeCategory: "all",
  searchQuery: "",
  selectedMenuId: null,
  selectedOption: "기본",
  orderLocked: false,
  soundEnabled: false,
  audioContext: null,
  adminOrderFilter: "all",
  knownPendingIds: new Set(),
  lastAlertMessage: "",
  freshAlertUntil: 0,
  returnTimer: null,
  language: localStorage.getItem(LANG_KEY) || "ko",
  accessMode: localStorage.getItem(ACCESS_KEY) || "default",
  paymentMode: localStorage.getItem(PAYMENT_KEY) || "postpaid",
  user: null,
  storeId: "",
  storeName: "",
  customerToken: "",
  customerQrValid: false,
  firebaseMode: "demo",
  firebaseStatus: "Firebase 연결 준비",
  unsubscribers: [],
  customerOrderUnsubscribe: null,
  menuSaveTimers: new Map(),
};

function formatMoney(value) {
  return formatter.format(value);
}

function loadMenu() {
  const saved = readJson(MENU_KEY);
  return Array.isArray(saved) && saved.length ? hydrateMenu(saved) : structuredClone(defaultMenu);
}

function saveMenu() {
  localStorage.setItem(MENU_KEY, JSON.stringify(state.menu));
  broadcastSync("menu");
}

function loadOrders() {
  const saved = readJson(ORDER_KEY);
  return Array.isArray(saved)
    ? saved.map((order) => ({ ...order, createdAt: new Date(order.createdAt) }))
    : [];
}

function saveOrders() {
  localStorage.setItem(ORDER_KEY, JSON.stringify(state.orders));
  broadcastSync("orders");
}

function broadcastSync(type) {
  if (!realtimeChannel) return;
  realtimeChannel.postMessage({ type, at: Date.now() });
}

function hydrateMenu(menu) {
  const defaults = new Map(defaultMenu.map((item) => [item.id, item]));
  return menu.map((item) => {
    const fallback = defaults.get(item.id) || {};
    const hydrated = {
      ...fallback,
      ...item,
      image: item.image || fallback.image || "",
      options: Array.isArray(item.options) && item.options.length ? item.options : fallbackOptions(item.category || fallback.category),
    };
    hydrated.translations = item.translations || buildMenuTranslations(hydrated);
    return hydrated;
  });
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function getTableInfo() {
  const params = new URLSearchParams(window.location.search);
  return {
    store: params.get("store") || "",
    table: params.get("table") || "05",
    token: params.get("token") || "",
  };
}

function activeOrderKey() {
  const { store, table } = getTableInfo();
  return `${ACTIVE_ORDER_PREFIX}:${store || "demo"}:${table}`;
}

function storesCollection() {
  return collection(db, "stores");
}

function storeDoc(storeId = state.storeId) {
  return doc(db, "stores", storeId);
}

function menusCollection(storeId = state.storeId) {
  return collection(db, "stores", storeId, "menus");
}

function menuDoc(menuId, storeId = state.storeId) {
  return doc(db, "stores", storeId, "menus", menuId);
}

function ordersCollection(storeId = state.storeId) {
  return collection(db, "stores", storeId, "orders");
}

function orderDoc(orderId, storeId = state.storeId) {
  return doc(db, "stores", storeId, "orders", orderId);
}

function qrSessionsCollection(storeId = state.storeId) {
  return collection(db, "stores", storeId, "qrSessions");
}

function qrSessionDoc(token, storeId = state.storeId) {
  return doc(db, "stores", storeId, "qrSessions", token);
}

function toDate(value) {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  return new Date(value);
}

function fromFirestoreMenu(snapshot, index = 0) {
  const data = snapshot.data();
  const item = {
    id: snapshot.id,
    category: data.category || "main",
    name: data.name || "새 메뉴",
    desc: data.desc || data.description || "",
    price: Number(data.price) || 0,
    image: data.image || "",
    badge: data.badge || "",
    options: Array.isArray(data.options) ? data.options : [],
    soldOut: Boolean(data.soldOut ?? data.sold_out),
    sortOrder: Number(data.sortOrder ?? data.sort_order ?? index),
    translations: data.translations || null,
  };
  item.translations = item.translations || buildMenuTranslations(item);
  return item;
}

function toFirestoreMenu(item, index = 0) {
  return {
    category: item.category || "main",
    name: item.name || "새 메뉴",
    desc: item.desc || "",
    price: Number(item.price) || 0,
    image: item.image || "",
    badge: item.badge || "",
    options: getMenuOptions(item),
    soldOut: Boolean(item.soldOut),
    sortOrder: Number(item.sortOrder ?? index),
    translations: item.translations || buildMenuTranslations(item),
    updatedAt: new Date(),
  };
}

function fromFirestoreOrder(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    table: data.table || data.tableNo || "05",
    tableNo: data.tableNo || data.table || "05",
    items: Array.isArray(data.items) ? data.items : [],
    total: Number(data.total) || 0,
    status: data.status || "pending",
    createdAt: toDate(data.createdAt),
  };
}

function toFirestoreOrder(order) {
  return {
    ...order,
    tableNo: String(order.tableNo || order.table || "05"),
    table: String(order.table || order.tableNo || "05"),
    createdAt: order.createdAt || new Date(),
    updatedAt: new Date(),
  };
}

function customerBaseUrl() {
  if (["localhost", "127.0.0.1"].includes(location.hostname)) {
    return new URL("index.html", location.href).toString();
  }
  if (location.hostname === "admin.blossom0948.cloud") {
    return "https://order.blossom0948.cloud/";
  }
  return "https://blossom0948.github.io/QRORDER-CUSTOMER/";
}

function qrUrlFor(session) {
  const url = new URL(customerBaseUrl());
  url.searchParams.set("store", state.storeId);
  url.searchParams.set("table", session.tableNo);
  url.searchParams.set("token", session.token);
  return url.toString();
}

function ensureQrLibrary() {
  if (typeof window.qrcode === "function") return Promise.resolve(window.qrcode);
  if (qrLibraryPromise) return qrLibraryPromise;

  qrLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = QR_CODE_CDN;
    script.async = true;
    script.onload = () => {
      if (typeof window.qrcode === "function") resolve(window.qrcode);
      else reject(new Error("QR library loaded without qrcode"));
    };
    script.onerror = () => reject(new Error("QR library failed to load"));
    document.head.append(script);
  });

  return qrLibraryPromise;
}

function randomToken() {
  if (window.crypto?.randomUUID) return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  return `${Date.now()}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

function clearFirebaseListeners() {
  state.unsubscribers.forEach((unsubscribe) => unsubscribe());
  state.unsubscribers = [];
  if (state.customerOrderUnsubscribe) state.customerOrderUnsubscribe();
  state.customerOrderUnsubscribe = null;
}

function getMenuOptions(item) {
  if (Array.isArray(item.options) && item.options.length) return item.options;
  return fallbackOptions(item.category);
}

function fallbackOptions(category) {
  if (category === "drink") return ["기본", "얼음 적게", "얼음 많이", "잔 추가"];
  if (category === "side") return ["기본", "덜 맵게", "맵게", "앞접시 필요"];
  return ["기본", "덜 익힘", "바싹 익힘", "쌈 채소 추가"];
}

function t(key) {
  return translations[state.language]?.[key] || translations.ko[key] || key;
}

function tr(key, replacements = {}) {
  return Object.entries(replacements).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, value),
    t(key),
  );
}

function categoryLabel(category) {
  return t(
    {
      all: "categoryAll",
      main: "categoryMain",
      side: "categorySide",
      drink: "categoryDrink",
    }[category] || "categoryAll",
  );
}

function statusLabel(status) {
  return t(
    {
      pending: "statusPending",
      cooking: "statusCooking",
      served: "statusServed",
    }[status] || "statusPending",
  );
}

function translateText(value, lang = state.language) {
  const text = String(value || "").trim();
  if (!text || lang === "ko") return text;
  if (exactMenuTranslations[text]?.[lang]) return exactMenuTranslations[text][lang];

  const glossary = menuGlossary[lang] || {};
  if (glossary[text]) return glossary[text];

  let translated = text;
  Object.keys(glossary)
    .sort((a, b) => b.length - a.length)
    .forEach((keyword) => {
      translated = translated.replaceAll(keyword, glossary[keyword]);
    });

  return translated === text ? text : translated;
}

function translateOptions(options, lang = state.language) {
  return options.map((option) => translateText(option, lang));
}

function buildMenuTranslations(item) {
  return ["en", "ja", "zh"].reduce((acc, lang) => {
    acc[lang] = {
      name: translateText(item.name, lang),
      desc: translateText(item.desc, lang),
      badge: translateText(item.badge || "", lang),
      options: translateOptions(getMenuOptions(item), lang),
    };
    return acc;
  }, {});
}

function ensureMenuTranslations(item) {
  if (!item.translations) item.translations = buildMenuTranslations(item);
  return item.translations;
}

function localizedMenuItem(item) {
  if (state.language === "ko") {
    return {
      ...item,
      localizedName: item.name,
      localizedDesc: item.desc,
      localizedBadge: item.badge || "",
      localizedOptions: getMenuOptions(item),
    };
  }

  const itemTranslations = ensureMenuTranslations(item)[state.language] || {};
  return {
    ...item,
    localizedName: itemTranslations.name || translateText(item.name),
    localizedDesc: itemTranslations.desc || translateText(item.desc),
    localizedBadge: itemTranslations.badge || translateText(item.badge || ""),
    localizedOptions: itemTranslations.options || translateOptions(getMenuOptions(item)),
  };
}

function localizedCartName(cartItem) {
  const menuItem = state.menu.find((entry) => entry.id === cartItem.id);
  return menuItem ? localizedMenuItem(menuItem).localizedName : translateText(cartItem.name);
}

function localizedOption(option) {
  return translateText(option || "기본");
}

function quantityText(qty) {
  if (state.language === "ko") return `${qty}개`;
  if (state.language === "ja") return `${qty}点`;
  if (state.language === "zh") return `${qty}份`;
  return `${qty}x`;
}

function makeCartLineId(menuId, option = "기본") {
  return `${menuId}::${option || "기본"}`;
}

function makeId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `order-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pageType() {
  return document.body.dataset.page;
}

function initCustomer() {
  const { store, table, token } = getTableInfo();
  state.storeId = store;
  state.customerToken = token;
  state.firebaseMode = store && token ? "customer" : "demo";
  state.paymentMode = "postpaid";

  document.querySelector("#storeName").textContent = "고깃집 온기";
  document.querySelector("#tableName").textContent = tr("tableLabel", { table: Number(table) || table });

  bindCustomerEvents();
  bindRealtimeSync();
  if (state.firebaseMode === "customer") initCustomerFirebase();
  else {
    window.addEventListener("storage", (event) => {
      if (event.key === MENU_KEY) {
        state.menu = loadMenu();
        renderCustomerMenu();
        renderPopularRail();
        renderCart();
      }
      if (event.key === ORDER_KEY) {
        state.orders = loadOrders();
        renderCurrentOrder();
      }
    });
    watchMenuChanges();
    watchOrderChanges();
  }
  renderCustomerMenu();
  renderPopularRail();
  renderCart();
  renderCurrentOrder();
  renderSecurityPanel();
  applyLanguage();
  applyAccessMode();
  applyPaymentMode();
}

async function initCustomerFirebase() {
  try {
    const { store, table, token } = getTableInfo();
    const storeSnapshot = await getDoc(storeDoc(store));
    if (!storeSnapshot.exists()) throw new Error("매장을 찾지 못했습니다.");

    state.storeName = storeSnapshot.data().name || "매장";
    document.querySelector("#storeName").textContent = state.storeName;

    const sessionSnapshot = await getDoc(qrSessionDoc(token, store));
    const session = sessionSnapshot.exists() ? sessionSnapshot.data() : null;
    state.customerQrValid =
      Boolean(session?.active) &&
      String(session.tableNo) === String(table) &&
      (!session.expiresAt || toDate(session.expiresAt) > new Date());

    if (!state.customerQrValid) {
      state.firebaseStatus = "QR 세션이 유효하지 않습니다.";
      document.querySelector("#placeOrder").disabled = true;
      renderSecurityPanel();
      return;
    }

    state.firebaseStatus = "Firebase 실시간 연결";
    const menuQuery = query(menusCollection(store), orderBy("sortOrder"));
    state.unsubscribers.push(
      onSnapshot(menuQuery, (snapshot) => {
        state.menu = snapshot.docs.map((entry, index) => fromFirestoreMenu(entry, index));
        if (state.menu.length === 0) state.menu = structuredClone(defaultMenu);
        renderCustomerMenu();
        renderPopularRail();
        renderCart();
      }),
    );

    const activeId = localStorage.getItem(activeOrderKey());
    if (activeId) watchCustomerActiveOrder(activeId, store);
    renderSecurityPanel();
  } catch (error) {
    console.error(error);
    state.firebaseStatus = error.message || "Firebase 연결 실패";
    state.customerQrValid = false;
    renderSecurityPanel();
  }
}

function watchCustomerActiveOrder(orderId, storeId = state.storeId) {
  if (state.customerOrderUnsubscribe) state.customerOrderUnsubscribe();
  state.customerOrderUnsubscribe = onSnapshot(orderDoc(orderId, storeId), (snapshot) => {
    if (!snapshot.exists()) {
      state.orders = [];
      localStorage.removeItem(activeOrderKey());
      renderCurrentOrder();
      return;
    }
    state.orders = [fromFirestoreOrder(snapshot)];
    renderCurrentOrder();
  });
}

function bindRealtimeSync() {
  if (!realtimeChannel) return;
  realtimeChannel.addEventListener("message", (event) => {
    if (!event.data?.type) return;
    if (event.data.type === "menu") {
      state.menu = loadMenu();
      if (pageType() === "customer") {
        renderCustomerMenu();
        renderPopularRail();
        renderCart();
      }
      if (pageType() === "admin") renderAdmin();
    }
    if (event.data.type === "orders") {
      state.orders = loadOrders();
      if (pageType() === "customer") renderCurrentOrder();
      if (pageType() === "admin") refreshOrders();
    }
  });
}

function watchMenuChanges() {
  let lastMenuSnapshot = JSON.stringify(state.menu);
  window.setInterval(() => {
    const nextMenu = loadMenu();
    const nextSnapshot = JSON.stringify(nextMenu);
    if (nextSnapshot === lastMenuSnapshot) return;
    state.menu = nextMenu;
    lastMenuSnapshot = nextSnapshot;
    renderCustomerMenu();
    renderPopularRail();
  }, 1200);
}

function watchOrderChanges() {
  let lastOrderSnapshot = JSON.stringify(state.orders);
  window.setInterval(() => {
    const nextOrders = loadOrders();
    const nextSnapshot = JSON.stringify(nextOrders);
    if (nextSnapshot === lastOrderSnapshot) return;
    state.orders = nextOrders;
    lastOrderSnapshot = nextSnapshot;
    renderCurrentOrder();
  }, 1200);
}

function bindCustomerEvents() {
  document.querySelector("#menuSearch").addEventListener("input", (event) => {
    state.searchQuery = event.target.value.trim().toLowerCase();
    renderCustomerMenu();
  });

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeCategory = button.dataset.category;
      document.querySelectorAll("[data-category]").forEach((tab) => {
        tab.classList.toggle("active", tab === button);
      });
      renderCustomerMenu();
    });
  });

  document.querySelector("#menuList").addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add]");
    const detailButton = event.target.closest("[data-detail]");
    if (addButton) {
      addToCart(addButton.dataset.add);
      return;
    }
    if (detailButton) openMenuDetail(detailButton.dataset.detail);
  });

  document.querySelector("#popularRail").addEventListener("click", (event) => {
    const button = event.target.closest("[data-quick-add]");
    if (button) addToCart(button.dataset.quickAdd);
  });

  document.querySelector("#cartItems").addEventListener("click", (event) => {
    const plus = event.target.closest("[data-plus]");
    const minus = event.target.closest("[data-minus]");
    const remove = event.target.closest("[data-remove]");

    if (plus) changeCartQty(plus.dataset.plus, 1);
    if (minus) changeCartQty(minus.dataset.minus, -1);
    if (remove) removeCartItem(remove.dataset.remove);
  });

  document.querySelector("#recommendations").addEventListener("click", (event) => {
    const button = event.target.closest("[data-recommend-add]");
    if (button) addToCart(button.dataset.recommendAdd);
  });

  document.querySelector("#currentOrder").addEventListener("click", (event) => {
    const button = event.target.closest("[data-service]");
    if (button) requestService(button.dataset.service);
  });

  document.querySelector("#clearCart").addEventListener("click", () => {
    state.cart = [];
    renderCart();
  });

  document.querySelector("#openCart").addEventListener("click", () => {
    document.querySelector("#cartPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector("#bottomOpenCart").addEventListener("click", () => {
    document.querySelector("#cartPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      state.language = button.dataset.lang;
      applyLanguage();
      renderCustomerMenu();
      renderCart();
    });
  });

  document.querySelectorAll("[data-access-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.accessMode = state.accessMode === button.dataset.accessMode ? "default" : button.dataset.accessMode;
      applyAccessMode();
    });
  });

  document.querySelectorAll("[data-payment-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.paymentMode = button.dataset.paymentMode;
      applyPaymentMode();
    });
  });

  document.querySelector("#viewPolicy").addEventListener("click", openPolicySheet);
  document.querySelector("#policySheet").addEventListener("click", (event) => {
    if (event.target.closest("[data-close-policy]")) closePolicySheet();
  });

  document.querySelector("#menuDetail").addEventListener("click", (event) => {
    if (event.target.closest("[data-close-detail]")) closeMenuDetail();
    const optionButton = event.target.closest("[data-option]");
    if (optionButton) {
      state.selectedOption = optionButton.dataset.option;
      document.querySelectorAll("[data-option]").forEach((button) => {
        button.classList.toggle("active", button === optionButton);
      });
    }
  });

  document.querySelector("#detailAdd").addEventListener("click", () => {
    if (!state.selectedMenuId) return;
    addToCart(state.selectedMenuId, state.selectedOption);
    closeMenuDetail();
  });

  document.querySelector("#placeOrder").addEventListener("click", placeOrder);
  document.querySelector("#newOrder").addEventListener("click", () => {
    stopReturnCountdown();
    showOrderScreen();
  });
}

function showOrderScreen() {
  document.querySelector("#orderComplete").hidden = true;
  document.querySelector(".menu-area").hidden = false;
  document.querySelector("#cartPanel").hidden = false;
}

function showCompleteScreen() {
  document.querySelector(".menu-area").hidden = true;
  document.querySelector("#cartPanel").hidden = true;
  document.querySelector("#orderComplete").hidden = false;
}

function openPolicySheet() {
  document.querySelector("#policySheet").hidden = false;
  document.body.classList.add("sheet-open");
}

function closePolicySheet() {
  document.querySelector("#policySheet").hidden = true;
  document.body.classList.remove("sheet-open");
}

function applyLanguage() {
  localStorage.setItem(LANG_KEY, state.language);
  document.body.dataset.lang = state.language;
  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === state.language);
  });

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });

  const languageState = document.querySelector("#languageState");
  if (languageState) languageState.textContent = t("languageReady");

  const title = document.querySelector("#menuTitle");
  if (title) title.textContent = t("menu");
  const tableName = document.querySelector("#tableName");
  if (tableName) {
    const { table } = getTableInfo();
    tableName.textContent = tr("tableLabel", { table: Number(table) || table });
  }
  const cartTitle = document.querySelector("#cartTitle");
  if (cartTitle) cartTitle.textContent = t("cart");
  const orderButton = document.querySelector("#placeOrder");
  if (orderButton) orderButton.textContent = t("orderNow");
  const policyButton = document.querySelector("#viewPolicy");
  if (policyButton) policyButton.textContent = t("policy");
  const clearCart = document.querySelector("#clearCart");
  if (clearCart) clearCart.setAttribute("aria-label", `${t("cart")} ${state.language === "ko" ? "비우기" : "clear"}`);
  applyPaymentMode();
  applyAccessMode();
  renderSecurityPanel();
  renderCurrentOrder();
}

function applyAccessMode() {
  if (state.accessMode === "contrast") state.accessMode = "default";
  localStorage.setItem(ACCESS_KEY, state.accessMode);
  document.body.classList.toggle("large-text", state.accessMode === "large");
  document.querySelectorAll("[data-access-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.accessMode === state.accessMode);
  });
  const accessState = document.querySelector("#accessState");
  if (!accessState) return;
  accessState.textContent = state.accessMode === "large" ? t("largeTextOn") : t("defaultView");
}

function applyPaymentMode() {
  localStorage.setItem(PAYMENT_KEY, state.paymentMode);
  document.querySelectorAll("[data-payment-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.paymentMode === state.paymentMode);
  });
  const hint = document.querySelector("#paymentModeHint");
  if (!hint) return;
  hint.textContent = state.paymentMode === "prepaid" ? t("prepaidHint") : t("postpaidHint");
}

function renderSecurityPanel() {
  const panel = document.querySelector("#securityPanel");
  if (!panel) return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || params.get("qr");
  const { table } = getTableInfo();
  const verified = state.firebaseMode === "customer" ? state.customerQrValid : Boolean(token && token.length >= 6);
  panel.innerHTML = `
    <div>
      <strong>${verified ? t("securityVerifiedTitle") : t("securityDemoTitle")}</strong>
      <span>${Number(table) || table} · ${verified ? t("tokenVerified") : state.firebaseStatus || t("tokenRecommended")}</span>
    </div>
    <small>${state.firebaseMode === "customer" ? "Firebase Firestore" : realtimeChannel ? t("realtimeOn") : t("storageSync")}</small>
  `;
  panel.classList.toggle("verified", verified);
}

function openMenuDetail(menuId) {
  const item = state.menu.find((entry) => entry.id === menuId);
  if (!item || item.soldOut) return;

  state.selectedMenuId = menuId;
  state.selectedOption = "기본";
  const view = localizedMenuItem(item);
  const sheet = document.querySelector("#menuDetail");
  const image = document.querySelector("#detailImage");
  const badge = document.querySelector("#detailBadge");
  const options = getMenuOptions(item);

  sheet.hidden = false;
  image.innerHTML = item.image
    ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(view.localizedName)}" />`
    : `<span>${escapeHtml(categoryLabel(item.category))}</span>`;
  badge.hidden = !view.localizedBadge;
  badge.textContent = view.localizedBadge || "";
  document.querySelector("#detailTitle").textContent = view.localizedName;
  document.querySelector("#detailDesc").textContent = view.localizedDesc;
  document.querySelector("#detailPrice").textContent = formatMoney(item.price);
  document.querySelector("#detailOptions").innerHTML = options
    .map(
      (option, index) => `
        <button class="${index === 0 ? "active" : ""}" type="button" data-option="${escapeAttr(option)}">
          ${escapeHtml(translateText(option))}
        </button>
      `,
    )
    .join("");
  document.body.classList.add("sheet-open");
}

function closeMenuDetail() {
  document.querySelector("#menuDetail").hidden = true;
  state.selectedMenuId = null;
  state.selectedOption = "기본";
  document.body.classList.remove("sheet-open");
}

function renderPopularRail() {
  const rail = document.querySelector("#popularRail");
  if (!rail) return;

  const highlighted = state.menu
    .filter((item) => !item.soldOut && item.badge)
    .concat(state.menu.filter((item) => !item.soldOut && !item.badge))
    .slice(0, 4);

  if (highlighted.length === 0) {
    rail.hidden = true;
    rail.innerHTML = "";
    return;
  }

  rail.hidden = false;
  rail.innerHTML = `
    <strong>${t("quickAdd")}</strong>
    <div>
      ${highlighted
        .map((item) => {
          const view = localizedMenuItem(item);
          return `
            <button type="button" data-quick-add="${item.id}">
              <span>${escapeHtml(view.localizedBadge || categoryLabel(item.category))}</span>
              ${escapeHtml(view.localizedName)}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderCustomerMenu() {
  const list = document.querySelector("#menuList");
  const filtered = state.menu.filter((item) => {
    const view = localizedMenuItem(item);
    const matchesCategory = state.activeCategory === "all" || item.category === state.activeCategory;
    const text = `${item.name} ${item.desc} ${item.badge || ""} ${view.localizedName} ${view.localizedDesc} ${view.localizedBadge}`.toLowerCase();
    const matchesSearch = !state.searchQuery || text.includes(state.searchQuery);
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-menu">${t("noSearchResult")}</div>`;
    return;
  }

  list.innerHTML = filtered
    .map((item) => {
      const view = localizedMenuItem(item);
      const thumb = item.image
        ? `<img class="menu-thumb" src="${escapeAttr(item.image)}" alt="${escapeAttr(view.localizedName)}" loading="lazy" />`
        : "";
      const badge = view.localizedBadge ? `<span class="menu-badge">${escapeHtml(view.localizedBadge)}</span>` : "";
      const category = `<span class="category-label">${categoryLabel(item.category)}</span>`;
      return `
        <article class="customer-menu-card ${item.image ? "has-image" : ""} ${item.soldOut ? "sold-out" : ""}">
          ${thumb}
          <div class="menu-copy">
            <div>
              <div class="menu-meta-line">${category}${badge}</div>
              <div class="menu-title-line">
                <h2>${escapeHtml(view.localizedName)}${item.soldOut ? `<span class="sold-badge">${t("soldOut")}</span>` : ""}</h2>
              </div>
              <p>${escapeHtml(view.localizedDesc)}</p>
            </div>
            <strong>${formatMoney(item.price)}</strong>
          </div>
          <div class="menu-actions">
            <button class="detail-button" type="button" data-detail="${item.id}" ${item.soldOut ? "disabled" : ""}>
              ${t("option")}
            </button>
            <button class="add-button" type="button" data-add="${item.id}" ${item.soldOut ? "disabled" : ""}>
              ${t("add")}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function addToCart(menuId, option = "기본") {
  const item = state.menu.find((entry) => entry.id === menuId);
  if (!item || item.soldOut) return;

  const lineId = makeCartLineId(menuId, option);
  const existing = state.cart.find((entry) => entry.lineId === lineId);
  if (existing) existing.qty += 1;
  else state.cart.push({ lineId, id: item.id, name: item.name, price: item.price, option, qty: 1 });
  renderCart();
}

function changeCartQty(lineId, amount) {
  const item = state.cart.find((entry) => entry.lineId === lineId || entry.id === lineId);
  if (!item) return;
  item.qty += amount;
  if (item.qty <= 0) removeCartItem(item.lineId || item.id);
  else renderCart();
}

function removeCartItem(lineId) {
  state.cart = state.cart.filter((entry) => (entry.lineId || entry.id) !== lineId);
  renderCart();
}

function renderCart() {
  const cartItems = document.querySelector("#cartItems");
  const cartCount = document.querySelector("#cartCount");
  const bottomBar = document.querySelector("#bottomCartBar");
  const totalQty = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  document.querySelector("#cartTotal").textContent = formatMoney(total);
  document.querySelector("#placeOrder").disabled = state.cart.length === 0;
  cartCount.textContent = String(totalQty);
  document.querySelector("#cartPanel").classList.toggle("is-empty", state.cart.length === 0);
  if (bottomBar) {
    bottomBar.hidden = state.cart.length === 0;
    document.querySelector("#bottomCartCount").textContent = tr("bottomCount", { count: totalQty });
    document.querySelector("#bottomCartTotal").textContent = formatMoney(total);
  }
  renderRecommendations();

  if (state.cart.length === 0) {
    cartItems.className = "cart-items empty";
    cartItems.textContent = t("emptyCart");
    return;
  }

  cartItems.className = "cart-items";
  cartItems.innerHTML = state.cart
    .map(
      (item) => {
        const lineId = item.lineId || item.id;
        const name = localizedCartName(item);
        const option = item.option && item.option !== "기본" ? `<small>${escapeHtml(localizedOption(item.option))}</small>` : "";
        return `
        <div class="cart-item">
          <div>
            <strong>${escapeHtml(name)}${option}</strong>
            <span>${formatMoney(item.price * item.qty)}</span>
          </div>
          <div class="cart-control">
            <button type="button" data-minus="${escapeAttr(lineId)}" aria-label="${escapeAttr(name)} -">−</button>
            <span>${item.qty}</span>
            <button type="button" data-plus="${escapeAttr(lineId)}" aria-label="${escapeAttr(name)} +">+</button>
            <button type="button" data-remove="${escapeAttr(lineId)}" aria-label="${escapeAttr(name)}">×</button>
          </div>
        </div>
      `;
      },
    )
    .join("");
}

function renderRecommendations() {
  const box = document.querySelector("#recommendations");
  if (!box) return;

  const cartIds = new Set(state.cart.map((item) => item.id));
  const hasMain = state.cart.some((item) => {
    const menuItem = state.menu.find((entry) => entry.id === item.id);
    return menuItem?.category === "main";
  });
  const preferredCategories = hasMain ? ["side", "drink"] : ["main", "side", "drink"];
  const recommended = state.menu
    .filter((item) => !item.soldOut && !cartIds.has(item.id) && preferredCategories.includes(item.category))
    .sort((a, b) => preferredCategories.indexOf(a.category) - preferredCategories.indexOf(b.category))
    .slice(0, 3);

  if (state.cart.length === 0 || recommended.length === 0) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }

  box.hidden = false;
  box.innerHTML = `
    <strong>${t("recommendations")}</strong>
    <div>
      ${recommended
        .map((item) => {
          const view = localizedMenuItem(item);
          return `
            <button type="button" data-recommend-add="${item.id}">
              <span>${escapeHtml(view.localizedName)}</span>
              <small>${formatMoney(item.price)}</small>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

async function placeOrder() {
  if (state.cart.length === 0 || state.orderLocked) return;
  if (state.firebaseMode === "customer" && !state.customerQrValid) {
    window.alert("QR 세션이 유효하지 않습니다. 직원에게 문의해 주세요.");
    return;
  }
  state.orderLocked = true;
  document.querySelector("#placeOrder").disabled = true;

  const { store, table, token } = getTableInfo();
  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const note = document.querySelector("#orderNote").value.trim();
  const orderNo = String(Date.now()).slice(-6);
  const order = {
    id: makeId(),
    orderNo,
    store: state.storeName || store || "고깃집 온기",
    storeId: store || state.storeId || "demo",
    table,
    tableNo: table,
    qrToken: token || "",
    items: state.cart.map((item) => ({ ...item })),
    total,
    note,
    paymentMode: "postpaid",
    paymentStatus: "pay-at-counter",
    status: "pending",
    createdAt: new Date(),
  };

  try {
    if (state.firebaseMode === "customer") {
      await setDoc(orderDoc(order.id, store), toFirestoreOrder(order));
      watchCustomerActiveOrder(order.id, store);
    } else {
      state.orders.unshift(order);
      saveOrders();
    }
  } catch (error) {
    console.error(error);
    window.alert(error.message || "주문을 저장하지 못했습니다.");
    state.orderLocked = false;
    renderCart();
    return;
  }
  localStorage.setItem(activeOrderKey(), order.id);
  state.cart = [];
  renderCart();
  renderCurrentOrder();

  showCompleteScreen();
  document.querySelector("#completeTitle").textContent = tr("completeTitle", { table: Number(table) || table });
  document.querySelector("#completeMeta").textContent = `${t("orderNo")} ${orderNo}`;
  document.querySelector("#completeMessage").textContent = tr("completePostpaid", { total: formatMoney(total) });
  document.querySelector("#orderNote").value = "";
  startReturnCountdown();
  state.orderLocked = false;
}

function startReturnCountdown() {
  const countdown = document.querySelector("#returnCountdown");
  let remaining = 5;
  countdown.textContent = tr("countdown", { seconds: remaining });
  stopReturnCountdown();
  state.returnTimer = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      stopReturnCountdown();
      showOrderScreen();
      return;
    }
    countdown.textContent = tr("countdown", { seconds: remaining });
  }, 1000);
}

function stopReturnCountdown() {
  if (!state.returnTimer) return;
  window.clearInterval(state.returnTimer);
  state.returnTimer = null;
}

function getActiveOrder() {
  const activeId = localStorage.getItem(activeOrderKey());
  if (!activeId) return null;
  const order = state.orders.find((entry) => entry.id === activeId);
  if (!order) {
    localStorage.removeItem(activeOrderKey());
    return null;
  }
  return order;
}

function renderCurrentOrder() {
  const panel = document.querySelector("#currentOrder");
  if (!panel) return;

  const order = getActiveOrder();
  if (!order) {
    panel.hidden = true;
    return;
  }

  const statusOrder = ["pending", "cooking", "served"];
  const currentIndex = Math.max(0, statusOrder.indexOf(order.status));
  const itemText = order.items
    .map((item) => {
      const name = localizedCartName(item);
      const option = item.option && item.option !== "기본" ? `(${localizedOption(item.option)})` : "";
      return `${name}${option} ${quantityText(item.qty)}`;
    })
    .join(", ");

  panel.hidden = false;
  document.querySelector("#currentOrderTitle").textContent = `${t("orderNo")} ${order.orderNo || "-"}`;
  document.querySelector("#currentOrderStatus").textContent = statusLabel(order.status);
  document.querySelector("#currentOrderItems").innerHTML = `
    <strong>${escapeHtml(itemText)}</strong>
    <span>${formatMoney(order.total)}</span>
  `;
  document.querySelectorAll("#progressSteps li").forEach((step, index) => {
    step.classList.toggle("is-done", index < currentIndex);
    step.classList.toggle("is-active", index === currentIndex);
  });
}

async function requestService(serviceName) {
  const { store, table, token } = getTableInfo();
  if (state.firebaseMode === "customer" && !state.customerQrValid) return;
  const orderNo = String(Date.now()).slice(-6);
  const requestOrder = {
    id: makeId(),
    orderNo,
    store: state.storeName || store || "고깃집 온기",
    storeId: store || state.storeId || "demo",
    table,
    tableNo: table,
    qrToken: token || "",
    items: [{ id: `service-${serviceName}`, name: `${serviceName} 요청`, price: 0, qty: 1 }],
    total: 0,
    note: `${serviceName} 부탁드립니다.`,
    status: "pending",
    service: true,
    createdAt: new Date(),
  };

  if (state.firebaseMode === "customer") await setDoc(orderDoc(requestOrder.id, store), toFirestoreOrder(requestOrder));
  else {
    state.orders.unshift(requestOrder);
    saveOrders();
  }

  const notice = document.querySelector("#serviceNotice");
  if (notice) {
    const message = tr("serviceSent", { service: translateText(serviceName) });
    notice.textContent = message;
    window.setTimeout(() => {
      if (notice.textContent === message) notice.textContent = "";
    }, 2500);
  }
}

function initAdmin() {
  bindAdminEvents();
  bindRealtimeSync();
  bindAdminFirebaseEvents();
  syncKnownPendingOrders();
  renderAdmin();
  renderFirebaseAdminPanel();
  handleAdminRedirectResult();
  onAuthStateChanged(auth, handleAdminAuthChange);
  window.setInterval(() => {
    if (state.firebaseMode !== "admin") refreshOrders();
  }, 1200);
}

function bindAdminFirebaseEvents() {
  document.querySelector("#googleLogin").addEventListener("click", async () => {
    state.firebaseStatus = "Google 로그인 창을 여는 중입니다.";
    renderFirebaseAdminPanel();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      state.firebaseStatus = firebaseAuthMessage(error);
      renderFirebaseAdminPanel();
      console.error(error);
    }
  });

  document.querySelector("#googleRedirectLogin").addEventListener("click", async () => {
    state.firebaseStatus = "Google 로그인 페이지로 이동합니다.";
    renderFirebaseAdminPanel();
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      state.firebaseStatus = firebaseAuthMessage(error);
      renderFirebaseAdminPanel();
      console.error(error);
    }
  });

  document.querySelector("#adminLogout").addEventListener("click", () => signOut(auth));

  document.querySelector("#createStoreForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const storeName = String(formData.get("storeName") || "").trim();
    const tableCount = Math.min(30, Math.max(1, Number(formData.get("tableCount")) || 10));
    if (!storeName) return;
    try {
      await createStoreWithDefaults(storeName, tableCount);
      event.currentTarget.reset();
    } catch (error) {
      console.error(error);
      state.firebaseStatus = firebaseWriteMessage(error);
      renderFirebaseAdminPanel();
    }
  });

  document.querySelector("#qrGeneratorForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.storeId) return;
    const formData = new FormData(event.currentTarget);
    const tableCount = Math.min(60, Math.max(1, Number(formData.get("qrTableCount")) || 10));
    await generateMissingQrSessions(tableCount);
  });

  document.querySelector("#printAllQr").addEventListener("click", () => printAllQrCards());

  document.querySelector("#qrLinks").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy-qr]");
    if (button) {
      await navigator.clipboard?.writeText(button.dataset.copyQr);
      button.textContent = "복사됨";
      window.setTimeout(() => {
        button.textContent = "링크 복사";
      }, 1400);
      return;
    }

    const printButton = event.target.closest("[data-print-qr]");
    if (printButton) {
      const card = printButton.closest(".qr-link-card");
      printQrCard(card);
    }
  });
}

async function handleAdminRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      state.firebaseStatus = "Google 로그인 완료. 매장을 불러오는 중입니다.";
      renderFirebaseAdminPanel();
    }
  } catch (error) {
    state.firebaseStatus = firebaseAuthMessage(error);
    renderFirebaseAdminPanel();
    console.error(error);
  }
}

function firebaseAuthMessage(error) {
  const code = error?.code || "";
  if (code === "auth/operation-not-allowed") {
    return "Firebase Authentication > Sign-in method에서 Google 로그인을 켜 주세요.";
  }
  if (code === "auth/unauthorized-domain") {
    return "Firebase Authentication > Settings > Authorized domains에 blossom0948.github.io와 admin.blossom0948.cloud를 추가해 주세요.";
  }
  if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
    return "브라우저가 로그인 창을 막았습니다. 아래 '로그인이 안 되면 여기를 누르세요' 버튼을 사용해 주세요.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "로그인 창이 닫혔습니다. Google로 시작하기를 다시 눌러 주세요.";
  }
  return "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

function firebaseWriteMessage(error) {
  const code = error?.code || "";
  const step = error?.qrOrderStep || "";
  if (code === "permission-denied") {
    if (step === "store") {
      return "매장 문서 생성이 막혔습니다. Firebase Console > Firestore Database > Rules에 최신 firestore.rules를 게시해야 합니다.";
    }
    if (step === "seed") {
      return "기본 메뉴/QR 생성이 막혔습니다. Firebase Console > Firestore Database > Rules에 최신 firestore.rules를 다시 게시해 주세요.";
    }
    return "매장 생성 권한이 막혔습니다. Firebase Firestore Rules에 최신 firestore.rules 내용을 게시해 주세요.";
  }
  if (code === "unavailable") {
    return "Firebase 연결이 불안정합니다. 네트워크를 확인하고 다시 눌러 주세요.";
  }
  return "매장 생성에 실패했습니다. Firebase 설정과 네트워크를 확인해 주세요.";
}

async function handleAdminAuthChange(user) {
  state.user = user;
  clearFirebaseListeners();
  if (!user) {
    state.firebaseMode = "demo";
    state.storeId = "";
    state.storeName = "";
    state.qrSessions = [];
    state.firebaseStatus = "로그인하면 Firebase 매장 데이터와 실시간 주문이 연결됩니다.";
    state.menu = loadMenu();
    state.orders = loadOrders();
    renderAdmin();
    renderFirebaseAdminPanel();
    return;
  }

  state.firebaseStatus = "Google 로그인 완료. 매장을 불러오는 중입니다.";
  renderFirebaseAdminPanel();
  try {
    await loadAdminStores();
  } catch (error) {
    console.error(error);
    state.firebaseStatus = error.message || "Firebase 매장 불러오기 실패";
    renderFirebaseAdminPanel();
  }
}

async function loadAdminStores() {
  if (!state.user) return;
  const storesQuery = query(storesCollection(), where("ownerUid", "==", state.user.uid));
  const snapshot = await getDocs(storesQuery);
  const stores = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  if (stores.length === 0) {
    state.firebaseMode = "admin";
    state.storeId = "";
    state.storeName = "";
    state.menu = [];
    state.orders = [];
    state.qrSessions = [];
    state.firebaseStatus = "아직 매장이 없습니다. 아래에서 매장을 만들면 메뉴와 QR이 자동 생성됩니다.";
    renderAdmin();
    renderFirebaseAdminPanel();
    return;
  }

  const selected = localStorage.getItem(SELECTED_STORE_KEY);
  const store = stores.find((entry) => entry.id === selected) || stores[0];
  await connectAdminStore(store.id);
}

async function connectAdminStore(storeId) {
  clearFirebaseListeners();
  state.firebaseMode = "admin";
  state.storeId = storeId;
  localStorage.setItem(SELECTED_STORE_KEY, storeId);

  state.unsubscribers.push(
    onSnapshot(storeDoc(storeId), (snapshot) => {
      const store = snapshot.data() || {};
      state.storeName = store.name || "매장";
      state.firebaseStatus = `${state.storeName} Firebase 실시간 연결됨`;
      renderFirebaseAdminPanel();
    }),
  );

  state.unsubscribers.push(
    onSnapshot(query(menusCollection(storeId), orderBy("sortOrder")), (snapshot) => {
      state.menu = snapshot.docs.map((entry, index) => fromFirestoreMenu(entry, index));
      renderMenuManager();
      renderMetrics();
      renderSystemStatus();
    }),
  );

  state.unsubscribers.push(
    onSnapshot(ordersCollection(storeId), (snapshot) => {
      const newOrders = snapshot.docs.map(fromFirestoreOrder).sort((a, b) => b.createdAt - a.createdAt);
      const knownBefore = new Set(state.knownPendingIds);
      state.orders = newOrders;
      const fresh = state.orders.filter((order) => order.status === "pending" && !knownBefore.has(order.id));
      if (fresh.length) notifyNewOrders(fresh);
      syncKnownPendingOrders();
      renderAdmin();
    }),
  );

  state.unsubscribers.push(
    onSnapshot(qrSessionsCollection(storeId), (snapshot) => {
      state.qrSessions = snapshot.docs
        .map((entry) => ({ token: entry.id, ...entry.data() }))
        .sort((a, b) => String(a.tableNo).localeCompare(String(b.tableNo), "ko", { numeric: true }));
      renderFirebaseAdminPanel();
      renderSystemStatus();
    }),
  );
}

async function createStoreWithDefaults(storeName, tableCount) {
  if (!state.user) return;
  state.firebaseStatus = "매장과 기본 메뉴, QR을 생성 중입니다.";
  renderFirebaseAdminPanel();

  const storeRef = doc(storesCollection());
  try {
    await setDoc(storeRef, {
      name: storeName,
      ownerUid: state.user.uid,
      ownerEmail: state.user.email || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    error.qrOrderStep = "store";
    throw error;
  }

  const batch = writeBatch(db);
  defaultMenu.forEach((item, index) => {
    const menu = structuredClone(item);
    menu.sortOrder = index + 1;
    menu.translations = buildMenuTranslations(menu);
    batch.set(doc(db, "stores", storeRef.id, "menus", menu.id), toFirestoreMenu(menu, index + 1));
  });

  for (let i = 1; i <= tableCount; i += 1) {
    const tableNo = String(i).padStart(2, "0");
    const token = randomToken();
    batch.set(doc(db, "stores", storeRef.id, "qrSessions", token), {
      tableNo,
      active: true,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    error.qrOrderStep = "seed";
    await deleteDoc(storeRef).catch(() => {});
    throw error;
  }
  await connectAdminStore(storeRef.id);
}

async function generateMissingQrSessions(tableCount) {
  if (!state.storeId) return;
  const status = document.querySelector("#qrGeneratorStatus");
  if (status) status.textContent = "테이블 QR을 확인하고 생성 중입니다.";
  state.firebaseStatus = "테이블 QR을 자동 생성 중입니다.";
  renderFirebaseAdminPanel();

  const existingTables = new Set(state.qrSessions.map((session) => String(session.tableNo).padStart(2, "0")));
  const batch = writeBatch(db);
  let created = 0;

  for (let i = 1; i <= tableCount; i += 1) {
    const tableNo = String(i).padStart(2, "0");
    if (existingTables.has(tableNo)) continue;
    const token = randomToken();
    batch.set(doc(db, "stores", state.storeId, "qrSessions", token), {
      tableNo,
      active: true,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });
    created += 1;
  }

  if (!created) {
    const message = `이미 ${tableCount}개 테이블 QR이 준비되어 있습니다.`;
    if (status) status.textContent = message;
    state.firebaseStatus = message;
    renderFirebaseAdminPanel();
    return;
  }

  try {
    await batch.commit();
    const message = `${created}개 테이블 QR을 새로 생성했습니다.`;
    if (status) status.textContent = message;
    state.firebaseStatus = message;
    renderFirebaseAdminPanel();
  } catch (error) {
    console.error(error);
    const message = "QR 생성 권한이 막혔습니다. Firebase Rules 게시 상태를 확인해 주세요.";
    if (status) status.textContent = message;
    state.firebaseStatus = message;
    renderFirebaseAdminPanel();
  }
}

function renderFirebaseAdminPanel() {
  const title = document.querySelector("#firebaseStoreTitle");
  const isSignedIn = Boolean(state.user);
  const hasStore = Boolean(state.storeId);
  const loginGate = document.querySelector("#loginGate");
  const adminHeader = document.querySelector("#adminHeader");
  const adminDashboard = document.querySelector("#adminDashboard");
  const loginStatus = document.querySelector("#loginStatus");

  if (loginGate) loginGate.hidden = isSignedIn;
  if (adminHeader) adminHeader.hidden = !isSignedIn;
  if (adminDashboard) adminDashboard.hidden = !isSignedIn;
  if (loginStatus) loginStatus.textContent = state.firebaseStatus;
  if (!title) return;

  title.textContent = hasStore ? state.storeName || "매장 연결됨" : isSignedIn ? "매장을 만들어 주세요" : "로그인 후 매장을 연결하세요";
  document.querySelector("#firebaseStatus").textContent = state.firebaseStatus;
  document.querySelector("#adminSession").hidden = !isSignedIn;
  document.querySelector("#adminUserLabel").textContent = state.user?.displayName || state.user?.email || "";
  document.querySelector("#createStoreForm").hidden = !isSignedIn || hasStore;
  document.querySelector("#storeTools").hidden = !hasStore;
  const qrTableInput = document.querySelector("[name='qrTableCount']");
  if (qrTableInput && document.activeElement !== qrTableInput) {
    qrTableInput.value = Math.max(10, state.qrSessions.length || Number(qrTableInput.value) || 10);
  }
  renderQrLinks();
}

function renderQrLinks() {
  const box = document.querySelector("#qrLinks");
  if (!box) return;
  if (!state.qrSessions.length) {
    box.innerHTML = '<div class="empty-column">QR 링크 없음</div>';
    return;
  }

  box.innerHTML = state.qrSessions
    .map((session) => {
      const url = qrUrlFor(session);
      const tableLabel = `${Number(session.tableNo) || session.tableNo}번 테이블`;
      return `
        <article class="qr-link-card" data-qr-card data-table-label="${escapeAttr(tableLabel)}">
          <div class="qr-card-head">
            <strong>${escapeHtml(tableLabel)}</strong>
            <span>손님용 QR</span>
          </div>
          <div class="qr-preview" data-qr-url="${escapeAttr(url)}">
            <span>QR 생성 중</span>
          </div>
          <a class="qr-url" href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>
          <div class="qr-actions">
            <button type="button" data-copy-qr="${escapeAttr(url)}">링크 복사</button>
            <a class="qr-download disabled" data-qr-download href="#" download="qrorder-${escapeAttr(String(session.tableNo))}.png">PNG 다운로드</a>
            <button type="button" data-print-qr>인쇄</button>
          </div>
        </article>
      `;
    })
    .join("");

  renderQrImages();
}

async function renderQrImages() {
  const previews = [...document.querySelectorAll("[data-qr-url]")];
  if (!previews.length) return;

  try {
    const makeQrCode = await ensureQrLibrary();
    await Promise.all(
      previews.map(async (preview) => {
        const url = preview.dataset.qrUrl;
        const qr = makeQrCode(0, "M");
        qr.addData(url);
        qr.make();
        const dataUrl = qr.createDataURL(8, 2);
        preview.innerHTML = `<img src="${escapeAttr(dataUrl)}" alt="테이블 주문 QR" />`;
        const card = preview.closest("[data-qr-card]");
        const download = card?.querySelector("[data-qr-download]");
        if (download) {
          download.href = dataUrl;
          download.classList.remove("disabled");
        }
      }),
    );
  } catch (error) {
    console.error(error);
    previews.forEach((preview) => {
      preview.innerHTML = "<span>QR 생성 실패<br />링크를 복사해 사용하세요</span>";
    });
  }
}

function printQrCard(card) {
  if (!card) return;
  const image = card.querySelector(".qr-preview img");
  const url = card.querySelector(".qr-url")?.textContent || "";
  const tableLabel = card.dataset.tableLabel || "테이블 QR";
  if (!image?.src) return;

  const printWindow = window.open("", "_blank", "width=420,height=620");
  if (!printWindow) return;
  printWindow.document.write(`
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(tableLabel)} QR</title>
        <style>
          * { box-sizing: border-box; }
          body { align-items: center; background: #f6f7f4; display: grid; font-family: Arial, sans-serif; justify-items: center; margin: 0; min-height: 100vh; padding: 22px; text-align: center; }
          main { background: #fff; border: 2px solid #191919; border-radius: 18px; overflow: hidden; width: min(100%, 360px); }
          header { background: #ff6f4d; color: #fff; padding: 18px 16px; }
          small { display: block; font-size: 12px; font-weight: 800; letter-spacing: 1px; }
          h1 { font-size: 34px; line-height: 1; margin: 6px 0 0; }
          .body { display: grid; gap: 12px; justify-items: center; padding: 22px 20px 18px; }
          img { height: 240px; width: 240px; }
          strong { color: #191919; display: block; font-size: 18px; }
          p { color: #555; font-size: 11px; line-height: 1.35; margin: 0; overflow-wrap: anywhere; }
        </style>
      </head>
      <body>
        <main>
          <header>
            <small>${escapeHtml(state.storeName || "QRORDER")}</small>
            <h1>${escapeHtml(tableLabel)}</h1>
          </header>
          <div class="body">
            <strong>카메라로 비추고 주문하세요</strong>
            <img src="${escapeAttr(image.src)}" alt="${escapeAttr(tableLabel)} QR" />
            <p>${escapeHtml(url)}</p>
          </div>
        </main>
        <script>
          window.addEventListener("load", () => {
            window.print();
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function printAllQrCards() {
  const cards = [...document.querySelectorAll(".qr-link-card")];
  const qrItems = cards
    .map((card) => {
      const image = card.querySelector(".qr-preview img");
      if (!image?.src) return "";
      const tableLabel = card.dataset.tableLabel || "테이블 QR";
      const url = card.querySelector(".qr-url")?.textContent || "";
      return `
        <section class="qr-print-card">
          <h2>${escapeHtml(tableLabel)}</h2>
          <div>
            <strong>카메라로 비추고 주문하세요</strong>
            <img src="${escapeAttr(image.src)}" alt="${escapeAttr(tableLabel)} QR" />
            <p>${escapeHtml(url)}</p>
          </div>
        </section>
      `;
    })
    .filter(Boolean)
    .join("");

  if (!qrItems) return;
  const printWindow = window.open("", "_blank", "width=900,height=720");
  if (!printWindow) return;
  printWindow.document.write(`
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(state.storeName || "매장")} 전체 QR</title>
        <style>
          * { box-sizing: border-box; }
          body { background: #fff; font-family: Arial, sans-serif; margin: 0; padding: 16px; }
          h1 { color: #191919; font-size: 20px; margin: 0 0 12px; }
          .qr-print-grid { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .qr-print-card { border: 2px solid #191919; border-radius: 14px; display: grid; min-height: 360px; overflow: hidden; page-break-inside: avoid; text-align: center; }
          .qr-print-card h2 { background: #ff6f4d; color: #fff; font-size: 28px; margin: 0; padding: 15px 10px; }
          .qr-print-card div { display: grid; gap: 9px; justify-items: center; padding: 14px; }
          .qr-print-card strong { font-size: 17px; }
          .qr-print-card img { height: 210px; width: 210px; }
          .qr-print-card p { color: #555; font-size: 9px; line-height: 1.35; margin: 0; overflow-wrap: anywhere; }
          @media print { body { padding: 0; } .qr-print-grid { gap: 7px; } .qr-print-card { border-radius: 0; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(state.storeName || "매장")} 테이블 QR</h1>
        <main class="qr-print-grid">${qrItems}</main>
        <script>
          window.addEventListener("load", () => window.print());
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function bindAdminEvents() {
  document.querySelector("#orderBoard").addEventListener("click", (event) => {
    const button = event.target.closest("[data-status]");
    if (!button) return;
    moveOrder(button.dataset.status);
  });

  document.querySelectorAll("[data-order-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.adminOrderFilter = button.dataset.orderFilter;
      document.querySelectorAll("[data-order-filter]").forEach((chip) => {
        chip.classList.toggle("active", chip === button);
      });
      renderOrderBoard();
      renderBoardHint();
    });
  });

  document.querySelector("#menuManager").addEventListener("input", (event) => {
    const input = event.target.closest("[data-field]");
    if (!input) return;
    updateMenuField(input.dataset.id, input.dataset.field, input.value, false);
  });

  document.querySelector("#menuManager").addEventListener("change", async (event) => {
    const checkbox = event.target.closest("[data-sold]");
    const input = event.target.closest("[data-field]");
    const fileInput = event.target.closest("[data-file]");
    if (checkbox) {
      updateMenuField(checkbox.dataset.sold, "soldOut", checkbox.checked);
      return;
    }
    if (input) {
      updateMenuField(input.dataset.id, input.dataset.field, input.value);
      return;
    }
    if (fileInput && fileInput.files[0]) {
      await updateMenuImageFromFile(fileInput.dataset.file, fileInput.files[0]);
    }
  });

  document.querySelector("#menuManager").addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete]");
    const moveButton = event.target.closest("[data-move]");
    if (deleteButton) {
      deleteMenuItem(deleteButton.dataset.delete);
      return;
    }
    if (moveButton) {
      moveMenuItem(moveButton.dataset.id, moveButton.dataset.move);
    }
  });

  document.querySelector("#seedOrder").addEventListener("click", seedOrder);
  document.querySelector("#addMenuForm").addEventListener("submit", addMenuItem);
  document.querySelector("#toggleSound").addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    if (state.soundEnabled) ensureAudioContext();
    const button = document.querySelector("#toggleSound");
    button.textContent = state.soundEnabled ? "딩동 알림 끄기" : "딩동 알림 켜기";
    button.setAttribute("aria-pressed", String(state.soundEnabled));
    if (state.soundEnabled) playAlert();
    renderAlertPanel();
  });
}

function refreshOrders() {
  state.orders = loadOrders();
  const newOrders = getNewPendingOrders();
  if (newOrders.length > 0) notifyNewOrders(newOrders);
  syncKnownPendingOrders();
  renderMetrics();
  renderAlertPanel();
  renderOrderBoard();
  renderBoardHint();
}

function syncKnownPendingOrders() {
  state.knownPendingIds = new Set(
    state.orders.filter((order) => order.status === "pending").map((order) => order.id),
  );
}

function getNewPendingOrders() {
  return state.orders.filter((order) => order.status === "pending" && !state.knownPendingIds.has(order.id));
}

function notifyNewOrders(newOrders) {
  const latest = newOrders[0];
  const itemName = latest.service ? latest.items[0]?.name || "직원 호출" : latest.items.map((item) => item.name).join(", ");
  state.lastAlertMessage = `${Number(latest.table) || latest.table}번 테이블 · ${itemName}`;
  state.freshAlertUntil = Date.now() + 5000;
  if (state.soundEnabled) playAlert();
  if ("vibrate" in navigator) navigator.vibrate([120, 50, 120]);
  renderAlertPanel(latest);
}

function renderAdmin() {
  renderMetrics();
  renderAlertPanel();
  renderOrderBoard();
  renderMenuManager();
  renderBoardHint();
  renderSystemStatus();
}

function renderMetrics() {
  if (!document.querySelector("#pendingCount")) return;
  document.querySelector("#pendingCount").textContent = countOrders("pending");
  document.querySelector("#cookingCount").textContent = countOrders("cooking");
  document.querySelector("#servedCount").textContent = countOrders("served");
  document.querySelector("#todaySales").textContent = formatMoney(
    state.orders.reduce((sum, order) => sum + order.total, 0),
  );

  const activeTables = new Set(
    state.orders
      .filter((order) => order.status !== "served")
      .map((order) => String(order.table)),
  );
  const pendingService = state.orders.filter((order) => order.status === "pending" && order.service).length;
  const soldOut = state.menu.filter((item) => item.soldOut).length;
  const pendingOrders = state.orders.filter((order) => order.status === "pending");
  const oldestMinutes = pendingOrders.length
    ? Math.max(...pendingOrders.map((order) => minutesSince(order.createdAt)))
    : 0;

  document.querySelector("#activeTableCount").textContent = String(activeTables.size);
  document.querySelector("#serviceCount").textContent = String(pendingService);
  document.querySelector("#soldOutCount").textContent = String(soldOut);
  document.querySelector("#oldestWait").textContent = `${oldestMinutes}분`;
}

function renderSystemStatus() {
  const realtime = document.querySelector("#realtimeStatus");
  if (!realtime) return;

  const withImages = state.menu.filter((item) => item.image).length;
  const soldOut = state.menu.filter((item) => item.soldOut).length;
  const pending = state.orders.filter((order) => order.status === "pending").length;
  const time = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

  realtime.textContent = state.firebaseMode === "admin" && state.storeId ? "Firebase Firestore" : realtimeChannel ? "탭 간 실시간 ON" : "저장소 폴링";
  document.querySelector("#securityStatus").textContent = state.firebaseMode === "admin" && state.storeId ? `${state.qrSessions.length}개 QR` : "테이블 토큰 권장";
  document.querySelector("#imageStatus").textContent = `${withImages}/${state.menu.length}개`;
  document.querySelector("#paymentStatus").textContent = "선불/후불 준비";
  document.querySelector("#systemSyncTime").textContent = `${time} 기준 · 대기 ${pending}건 · 품절 ${soldOut}개`;
}

function countOrders(status) {
  return String(state.orders.filter((order) => order.status === status).length);
}

function renderAlertPanel(latestOrder = null) {
  const panel = document.querySelector("#alertPanel");
  if (!panel) return;

  const pending = state.orders.filter((order) => order.status === "pending");
  const title = pending.length > 0 ? `${pending.length}건 접수 대기` : "새 주문 대기 중";
  const message =
    pending.length > 0
      ? state.lastAlertMessage ||
        (pending[0]
          ? `${Number(pending[0].table) || pending[0].table}번 테이블 주문을 확인하세요.`
          : "대기 주문을 확인하세요.")
      : "영업 시작 전에 딩동 알림을 켜두면 새 주문과 직원 호출을 바로 들을 수 있습니다.";

  panel.classList.toggle("has-new", Boolean(latestOrder) || state.freshAlertUntil > Date.now());
  document.querySelector("#alertTitle").textContent = title;
  document.querySelector("#alertMessage").textContent = message;
  document.querySelector("#soundState").textContent = state.soundEnabled ? "딩동 알림 켜짐" : "알림 꺼짐";
}

function renderBoardHint() {
  const hint = document.querySelector("#boardHint");
  if (!hint) return;

  const filteredCount = state.orders.filter(orderMatchesFilter).length;
  const filterLabel = {
    all: "전체 주문",
    food: "음식 주문",
    service: "직원 호출",
  }[state.adminOrderFilter];
  hint.textContent = `${filterLabel} ${filteredCount}건 표시 중 · 대기 주문은 딩동 알림으로 알려줍니다.`;
}

function renderOrderBoard() {
  const columns = [
    { id: "pending", title: "대기", action: "조리 시작" },
    { id: "cooking", title: "조리중", action: "완료 처리" },
    { id: "served", title: "완료", action: "정리" },
  ];

  document.querySelector("#orderBoard").innerHTML = columns
    .map((column) => {
      const orders = state.orders.filter((order) => order.status === column.id && orderMatchesFilter(order));
      return `
        <section class="kanban-column">
          <h3>${column.title}<span>${orders.length}</span></h3>
          ${
            orders.length
              ? orders.map((order) => renderOrderCard(order, column)).join("")
              : '<div class="empty-column">주문 없음</div>'
          }
        </section>
      `;
    })
    .join("");
}

function orderMatchesFilter(order) {
  if (state.adminOrderFilter === "food") return !order.service;
  if (state.adminOrderFilter === "service") return Boolean(order.service);
  return true;
}

function renderOrderCard(order, column) {
  const itemList = order.items
    .map((item) => {
      const option = item.option && item.option !== "기본" ? ` · ${item.option}` : "";
      return `<li>${escapeHtml(item.name)}${escapeHtml(option)} ${item.qty}개</li>`;
    })
    .join("");
  const minutes = minutesSince(order.createdAt);
  const waitClass = order.status === "pending" && minutes >= 10 ? "is-urgent" : "";
  const note = order.note ? `<p class="order-note-line">요청: ${escapeHtml(order.note)}</p>` : "";
  const orderNo = order.orderNo ? `<small>주문번호 ${escapeHtml(order.orderNo)}</small>` : "";
  const serviceBadge = order.service ? '<span class="service-badge">직원 호출</span>' : "";
  const paymentBadge = '<span class="payment-badge">후불</span>';

  return `
    <article class="order-card ${order.status} ${waitClass}">
      <div class="order-card-head">
        <strong>${Number(order.table) || order.table}번 테이블</strong>
        <span>${serviceBadge}${paymentBadge}${formatMoney(order.total)}</span>
      </div>
      <div class="order-card-meta">
        ${orderNo}
        <small>${minutes === 0 ? "방금 접수" : `${minutes}분 전 접수`}</small>
      </div>
      <ul>${itemList}</ul>
      ${note}
      <button type="button" data-status="${order.id}">${column.action}</button>
    </article>
  `;
}

function minutesSince(value) {
  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
}

function moveOrder(orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return;

  const previousStatus = order.status;
  if (order.status === "pending") order.status = "cooking";
  else if (order.status === "cooking") order.status = "served";
  else state.orders = state.orders.filter((entry) => entry.id !== orderId);

  if (state.firebaseMode === "admin" && state.storeId) {
    if (previousStatus === "served") {
      deleteDoc(orderDoc(orderId)).catch(console.error);
    } else {
      updateDoc(orderDoc(orderId), { status: order.status, updatedAt: new Date() }).catch(console.error);
    }
  } else saveOrders();
  renderAdmin();
}

function renderMenuManager() {
  document.querySelector("#menuManager").innerHTML = state.menu
    .map((item, index) => {
      const preview = item.image
        ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)} 이미지 미리보기" />`
        : `<span class="image-placeholder">이미지 없음</span>`;
      return `
        <article class="menu-manage-row">
          <div class="image-preview">${preview}</div>
          <label>
            메뉴명
            <input data-id="${item.id}" data-field="name" value="${escapeAttr(item.name)}" />
          </label>
          <label>
            설명
            <input data-id="${item.id}" data-field="desc" value="${escapeAttr(item.desc)}" />
          </label>
          <label>
            분류
            <select data-id="${item.id}" data-field="category">
              <option value="main" ${item.category === "main" ? "selected" : ""}>메인</option>
              <option value="side" ${item.category === "side" ? "selected" : ""}>사이드</option>
              <option value="drink" ${item.category === "drink" ? "selected" : ""}>음료</option>
            </select>
          </label>
          <label>
            가격
            <input data-id="${item.id}" data-field="price" type="number" min="0" step="500" value="${item.price}" />
          </label>
          <label>
            배지
            <input data-id="${item.id}" data-field="badge" value="${escapeAttr(item.badge || "")}" placeholder="추천, 인기" />
          </label>
          <label>
            옵션
            <input data-id="${item.id}" data-field="options" value="${escapeAttr(getMenuOptions(item).join(", "))}" placeholder="기본, 덜 맵게" />
          </label>
          <label>
            이미지 URL
            <input data-id="${item.id}" data-field="image" value="${escapeAttr(item.image)}" placeholder="https://..." />
          </label>
          <label>
            파일에서 변경
            <input data-file="${item.id}" type="file" accept="image/*" />
          </label>
          <label class="sold-toggle">
            <input data-sold="${item.id}" type="checkbox" ${item.soldOut ? "checked" : ""} />
            품절
          </label>
          <div class="row-actions">
            <button type="button" data-id="${item.id}" data-move="up" ${index === 0 ? "disabled" : ""}>위</button>
            <button type="button" data-id="${item.id}" data-move="down" ${index === state.menu.length - 1 ? "disabled" : ""}>아래</button>
            <button class="delete-menu" type="button" data-delete="${item.id}">삭제</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateMenuField(id, field, value, shouldRender = true) {
  const item = state.menu.find((entry) => entry.id === id);
  if (!item) return;
  if (field === "price") item[field] = Number(value) || 0;
  else if (field === "options") item[field] = String(value).split(",").map((entry) => entry.trim()).filter(Boolean);
  else item[field] = value;
  if (["name", "desc", "badge", "options", "category"].includes(field)) item.translations = buildMenuTranslations(item);
  saveMenu();
  queueMenuPersist(item);
  if (pageType() === "admin") {
    renderMetrics();
    renderSystemStatus();
  }
  if (shouldRender) renderMenuManager();
}

function queueMenuPersist(item) {
  if (state.firebaseMode !== "admin" || !state.storeId) return;
  window.clearTimeout(state.menuSaveTimers.get(item.id));
  state.menuSaveTimers.set(
    item.id,
    window.setTimeout(() => {
      setDoc(menuDoc(item.id), toFirestoreMenu(item, state.menu.indexOf(item) + 1), { merge: true }).catch(console.error);
    }, 450),
  );
}

async function updateMenuImageFromFile(id, file) {
  try {
    const dataUrl = await imageFileToDataUrl(file);
    updateMenuField(id, "image", dataUrl);
  } catch (error) {
    window.alert(error.message || "이미지를 적용하지 못했습니다.");
  }
}

async function addMenuItem(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price")) || 0;
  if (!name || price <= 0) return;

  const imageFile = form.elements.imageFile.files[0];
  const image = imageFile ? await imageFileToDataUrl(imageFile) : "";

  const newItem = {
    id: `menu-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category: String(formData.get("category") || "main"),
    name,
    desc: String(formData.get("desc") || "").trim() || "새 메뉴",
    price,
    image,
    badge: String(formData.get("badge") || "").trim(),
    options: String(formData.get("options") || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    soldOut: false,
  };
  newItem.translations = buildMenuTranslations(newItem);
  state.menu.push(newItem);
  if (state.firebaseMode === "admin" && state.storeId) await setDoc(menuDoc(newItem.id), toFirestoreMenu(newItem, state.menu.length));
  else saveMenu();
  form.reset();
  renderMenuManager();
  renderMetrics();
  renderSystemStatus();
}

function deleteMenuItem(id) {
  const item = state.menu.find((entry) => entry.id === id);
  if (!item) return;
  if (!confirm(`${item.name} 메뉴를 삭제할까요?`)) return;
  state.menu = state.menu.filter((entry) => entry.id !== id);
  if (state.firebaseMode === "admin" && state.storeId) deleteDoc(menuDoc(id)).catch(console.error);
  else saveMenu();
  renderMenuManager();
  renderMetrics();
  renderSystemStatus();
}

function moveMenuItem(id, direction) {
  const index = state.menu.findIndex((entry) => entry.id === id);
  if (index < 0) return;

  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= state.menu.length) return;

  const [item] = state.menu.splice(index, 1);
  state.menu.splice(nextIndex, 0, item);
  state.menu.forEach((entry, entryIndex) => {
    entry.sortOrder = entryIndex + 1;
  });
  if (state.firebaseMode === "admin" && state.storeId) {
    const batch = writeBatch(db);
    state.menu.forEach((entry) => batch.update(menuDoc(entry.id), { sortOrder: entry.sortOrder, updatedAt: new Date() }));
    batch.commit().catch(console.error);
  } else saveMenu();
  renderMenuManager();
  renderSystemStatus();
}

function imageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => resolve(String(reader.result));
      image.onload = () => {
        const maxSize = 720;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function seedOrder() {
  const available = state.menu.filter((item) => !item.soldOut);
  if (available.length === 0) return;
  const selected = available.slice(0, 2).map((item, index) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    qty: index + 1,
  }));
  const total = selected.reduce((sum, item) => sum + item.price * item.qty, 0);

  const order = {
    id: makeId(),
    store: state.storeName || "고깃집 온기",
    storeId: state.storeId || "demo",
    table: "05",
    tableNo: "05",
    qrToken: state.qrSessions[0]?.token || "",
    items: selected,
    total,
    note: "앞접시 하나 더 부탁드립니다.",
    orderNo: String(Date.now()).slice(-6),
    status: "pending",
    createdAt: new Date(),
  };

  if (state.firebaseMode === "admin" && state.storeId) await setDoc(orderDoc(order.id), toFirestoreOrder(order));
  else {
    state.orders.unshift(order);
    saveOrders();
  }
  notifyNewOrders([order]);
  syncKnownPendingOrders();
  renderAdmin();
}

function playAlert() {
  if (!state.soundEnabled) return;
  const audio = ensureAudioContext();
  if (!audio) return;

  const playDingDong = () => {
    const now = audio.currentTime + 0.03;
    playTone(audio, 1046.5, now, 0.16, 0.18);
    playTone(audio, 784, now + 0.2, 0.24, 0.2);
  };

  if (audio.state === "suspended") {
    audio.resume().then(playDingDong).catch(() => {});
    return;
  }

  playDingDong();
}

function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!state.audioContext) state.audioContext = new AudioContextClass();
  return state.audioContext;
}

function playTone(audio, frequency, start, duration, volume) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

if (pageType() === "customer") initCustomer();
if (pageType() === "admin") initAdmin();
