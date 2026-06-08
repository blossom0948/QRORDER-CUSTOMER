const MENU_KEY = "qrorder.menu.v3";
const ORDER_KEY = "qrorder.orders.v3";

const formatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const categoryLabels = {
  all: "전체",
  main: "메인",
  side: "사이드",
  drink: "음료",
};

const defaultMenu = [
  {
    id: "pork-set",
    category: "main",
    name: "숙성 삼겹살 한판",
    desc: "초벌 숙성 삼겹살, 쌈 채소, 기본 찬",
    price: 17000,
    image: "",
    soldOut: false,
  },
  {
    id: "stew",
    category: "side",
    name: "차돌 된장찌개",
    desc: "고기 주문과 함께 많이 찾는 국물 메뉴",
    price: 8000,
    image: "",
    soldOut: false,
  },
  {
    id: "egg",
    category: "side",
    name: "치즈 계란찜",
    desc: "부드러운 계란찜에 치즈를 올린 사이드",
    price: 6500,
    image: "",
    soldOut: true,
  },
  {
    id: "soju",
    category: "drink",
    name: "소주",
    desc: "추가 주문이 잦은 기본 주류",
    price: 5000,
    image: "",
    soldOut: false,
  },
  {
    id: "cola",
    category: "drink",
    name: "콜라",
    desc: "탄산음료",
    price: 2500,
    image: "",
    soldOut: false,
  },
];

const state = {
  menu: loadMenu(),
  orders: loadOrders(),
  cart: [],
  activeCategory: "all",
  soundEnabled: false,
};

function formatMoney(value) {
  return formatter.format(value);
}

function loadMenu() {
  const saved = readJson(MENU_KEY);
  return Array.isArray(saved) && saved.length ? saved : structuredClone(defaultMenu);
}

function saveMenu() {
  localStorage.setItem(MENU_KEY, JSON.stringify(state.menu));
}

function loadOrders() {
  const saved = readJson(ORDER_KEY);
  return Array.isArray(saved)
    ? saved.map((order) => ({ ...order, createdAt: new Date(order.createdAt) }))
    : [];
}

function saveOrders() {
  localStorage.setItem(ORDER_KEY, JSON.stringify(state.orders));
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
    store: params.get("store") || "고깃집 온기",
    table: params.get("table") || "05",
  };
}

function makeId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `order-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pageType() {
  return document.body.dataset.page;
}

function initCustomer() {
  const { store, table } = getTableInfo();
  document.querySelector("#storeName").textContent = store;
  document.querySelector("#tableName").textContent = `${Number(table) || table}번 테이블`;

  bindCustomerEvents();
  window.addEventListener("storage", (event) => {
    if (event.key !== MENU_KEY) return;
    state.menu = loadMenu();
    renderCustomerMenu();
  });
  watchMenuChanges();
  renderCustomerMenu();
  renderCart();
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
  }, 1200);
}

function bindCustomerEvents() {
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
    if (addButton) addToCart(addButton.dataset.add);
  });

  document.querySelector("#cartItems").addEventListener("click", (event) => {
    const plus = event.target.closest("[data-plus]");
    const minus = event.target.closest("[data-minus]");
    const remove = event.target.closest("[data-remove]");

    if (plus) changeCartQty(plus.dataset.plus, 1);
    if (minus) changeCartQty(minus.dataset.minus, -1);
    if (remove) removeCartItem(remove.dataset.remove);
  });

  document.querySelector("#clearCart").addEventListener("click", () => {
    state.cart = [];
    renderCart();
  });

  document.querySelector("#openCart").addEventListener("click", () => {
    document.querySelector("#cartPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector("#placeOrder").addEventListener("click", placeOrder);
  document.querySelector("#newOrder").addEventListener("click", () => {
    document.querySelector("#orderComplete").hidden = true;
    document.querySelector(".menu-area").hidden = false;
    document.querySelector("#cartPanel").hidden = false;
  });
}

function renderCustomerMenu() {
  const list = document.querySelector("#menuList");
  const filtered = state.menu.filter((item) => {
    return state.activeCategory === "all" || item.category === state.activeCategory;
  });

  list.innerHTML = filtered
    .map((item) => {
      const thumb = item.image
        ? `<img class="menu-thumb" src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)} 이미지" loading="lazy" />`
        : "";
      return `
        <article class="customer-menu-card ${item.image ? "has-image" : ""} ${item.soldOut ? "sold-out" : ""}">
          ${thumb}
          <div class="menu-copy">
            <div>
              <h2>${escapeHtml(item.name)}${item.soldOut ? '<span class="sold-badge">품절</span>' : ""}</h2>
              <p>${escapeHtml(item.desc)}</p>
            </div>
            <strong>${formatMoney(item.price)}</strong>
          </div>
          <button class="add-button" type="button" data-add="${item.id}" ${item.soldOut ? "disabled" : ""}>
            담기
          </button>
        </article>
      `;
    })
    .join("");
}

function addToCart(menuId) {
  const item = state.menu.find((entry) => entry.id === menuId);
  if (!item || item.soldOut) return;

  const existing = state.cart.find((entry) => entry.id === menuId);
  if (existing) existing.qty += 1;
  else state.cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
  renderCart();
}

function changeCartQty(menuId, amount) {
  const item = state.cart.find((entry) => entry.id === menuId);
  if (!item) return;
  item.qty += amount;
  if (item.qty <= 0) removeCartItem(menuId);
  else renderCart();
}

function removeCartItem(menuId) {
  state.cart = state.cart.filter((entry) => entry.id !== menuId);
  renderCart();
}

function renderCart() {
  const cartItems = document.querySelector("#cartItems");
  const cartCount = document.querySelector("#cartCount");
  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  document.querySelector("#cartTotal").textContent = formatMoney(total);
  document.querySelector("#placeOrder").disabled = state.cart.length === 0;
  cartCount.textContent = String(state.cart.reduce((sum, item) => sum + item.qty, 0));

  if (state.cart.length === 0) {
    cartItems.className = "cart-items empty";
    cartItems.textContent = "담긴 메뉴가 없습니다.";
    return;
  }

  cartItems.className = "cart-items";
  cartItems.innerHTML = state.cart
    .map(
      (item) => `
        <div class="cart-item">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <span>${formatMoney(item.price * item.qty)}</span>
          </div>
          <div class="cart-control">
            <button type="button" data-minus="${item.id}" aria-label="${escapeAttr(item.name)} 수량 줄이기">−</button>
            <span>${item.qty}</span>
            <button type="button" data-plus="${item.id}" aria-label="${escapeAttr(item.name)} 수량 늘리기">+</button>
            <button type="button" data-remove="${item.id}" aria-label="${escapeAttr(item.name)} 삭제">삭제</button>
          </div>
        </div>
      `,
    )
    .join("");
}

function placeOrder() {
  if (state.cart.length === 0) return;

  const { store, table } = getTableInfo();
  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const order = {
    id: makeId(),
    store,
    table,
    items: state.cart.map((item) => ({ ...item })),
    total,
    status: "pending",
    createdAt: new Date(),
  };

  state.orders.unshift(order);
  saveOrders();
  state.cart = [];
  renderCart();

  document.querySelector(".menu-area").hidden = true;
  document.querySelector("#cartPanel").hidden = true;
  document.querySelector("#orderComplete").hidden = false;
  document.querySelector("#completeTitle").textContent = `${Number(table) || table}번 테이블 주문 접수`;
  document.querySelector("#completeMessage").textContent = `합계 ${formatMoney(total)} 주문이 접수되었습니다. 직원이 확인 후 준비합니다.`;
}

function initAdmin() {
  bindAdminEvents();
  renderAdmin();
  window.setInterval(refreshOrders, 1200);
}

function bindAdminEvents() {
  document.querySelector("#orderBoard").addEventListener("click", (event) => {
    const button = event.target.closest("[data-status]");
    if (!button) return;
    moveOrder(button.dataset.status);
  });

  document.querySelector("#menuManager").addEventListener("input", (event) => {
    const input = event.target.closest("[data-field]");
    if (!input) return;
    updateMenuField(input.dataset.id, input.dataset.field, input.value, false);
  });

  document.querySelector("#menuManager").addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-sold]");
    const input = event.target.closest("[data-field]");
    if (checkbox) updateMenuField(checkbox.dataset.sold, "soldOut", checkbox.checked);
    if (input) updateMenuField(input.dataset.id, input.dataset.field, input.value);
  });

  document.querySelector("#seedOrder").addEventListener("click", seedOrder);
  document.querySelector("#toggleSound").addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    const button = document.querySelector("#toggleSound");
    button.textContent = state.soundEnabled ? "알림 끄기" : "알림 켜기";
    button.setAttribute("aria-pressed", String(state.soundEnabled));
    if (state.soundEnabled) playAlert();
  });
}

function refreshOrders() {
  const previousPending = state.orders.filter((order) => order.status === "pending").length;
  state.orders = loadOrders();
  const nextPending = state.orders.filter((order) => order.status === "pending").length;
  if (state.soundEnabled && nextPending > previousPending) playAlert();
  renderAdmin();
}

function renderAdmin() {
  renderMetrics();
  renderOrderBoard();
  renderMenuManager();
}

function renderMetrics() {
  document.querySelector("#pendingCount").textContent = countOrders("pending");
  document.querySelector("#cookingCount").textContent = countOrders("cooking");
  document.querySelector("#servedCount").textContent = countOrders("served");
  document.querySelector("#todaySales").textContent = formatMoney(
    state.orders.reduce((sum, order) => sum + order.total, 0),
  );
}

function countOrders(status) {
  return String(state.orders.filter((order) => order.status === status).length);
}

function renderOrderBoard() {
  const columns = [
    { id: "pending", title: "대기", action: "조리 시작" },
    { id: "cooking", title: "조리중", action: "완료 처리" },
    { id: "served", title: "완료", action: "정리" },
  ];

  document.querySelector("#orderBoard").innerHTML = columns
    .map((column) => {
      const orders = state.orders.filter((order) => order.status === column.id);
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

function renderOrderCard(order, column) {
  const itemList = order.items
    .map((item) => `<li>${escapeHtml(item.name)} ${item.qty}개</li>`)
    .join("");
  const minutes = Math.max(0, Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000));

  return `
    <article class="order-card ${order.status}">
      <div class="order-card-head">
        <strong>${Number(order.table) || order.table}번 테이블</strong>
        <span>${formatMoney(order.total)}</span>
      </div>
      <ul>${itemList}</ul>
      <small>${minutes === 0 ? "방금 접수" : `${minutes}분 전 접수`}</small>
      <button type="button" data-status="${order.id}">${column.action}</button>
    </article>
  `;
}

function moveOrder(orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return;

  if (order.status === "pending") order.status = "cooking";
  else if (order.status === "cooking") order.status = "served";
  else state.orders = state.orders.filter((entry) => entry.id !== orderId);

  saveOrders();
  renderAdmin();
}

function renderMenuManager() {
  document.querySelector("#menuManager").innerHTML = state.menu
    .map((item) => {
      const preview = item.image
        ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)} 이미지 미리보기" />`
        : `<span class="image-placeholder">이미지 없음</span>`;
      return `
        <article class="menu-manage-row">
          <div class="image-preview">${preview}</div>
          <div class="manage-copy">
            <strong>${escapeHtml(item.name)}</strong>
            <small>${categoryLabels[item.category]}</small>
          </div>
          <label>
            이미지 URL
            <input data-id="${item.id}" data-field="image" value="${escapeAttr(item.image)}" placeholder="https://..." />
          </label>
          <label>
            가격
            <input data-id="${item.id}" data-field="price" type="number" min="0" step="500" value="${item.price}" />
          </label>
          <label class="sold-toggle">
            <input data-sold="${item.id}" type="checkbox" ${item.soldOut ? "checked" : ""} />
            품절
          </label>
        </article>
      `;
    })
    .join("");
}

function updateMenuField(id, field, value, shouldRender = true) {
  const item = state.menu.find((entry) => entry.id === id);
  if (!item) return;
  item[field] = field === "price" ? Number(value) || 0 : value;
  saveMenu();
  if (shouldRender) renderMenuManager();
}

function seedOrder() {
  const available = state.menu.filter((item) => !item.soldOut);
  if (available.length === 0) return;
  const selected = available.slice(0, 2).map((item, index) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    qty: index + 1,
  }));
  const total = selected.reduce((sum, item) => sum + item.price * item.qty, 0);

  state.orders.unshift({
    id: makeId(),
    store: "고깃집 온기",
    table: "05",
    items: selected,
    total,
    status: "pending",
    createdAt: new Date(),
  });
  saveOrders();
  renderAdmin();
  playAlert();
}

function playAlert() {
  if (!state.soundEnabled) return;
  const audio = new AudioContext();
  const now = audio.currentTime;

  [0, 0.16, 0.32].forEach((offset) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.16, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12);
    osc.connect(gain).connect(audio.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.14);
  });
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
