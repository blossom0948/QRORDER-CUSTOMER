const MENU_KEY = "qrorder.menu.v3";
const ORDER_KEY = "qrorder.orders.v3";
const ACTIVE_ORDER_PREFIX = "qrorder.activeOrder.v3";

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

const statusLabels = {
  pending: "접수",
  cooking: "조리중",
  served: "완료",
};

const defaultMenu = [
  {
    id: "pork-set",
    category: "main",
    name: "숙성 삼겹살 한판",
    desc: "초벌 숙성 삼겹살, 쌈 채소, 기본 찬",
    price: 17000,
    image: "",
    badge: "인기",
    soldOut: false,
  },
  {
    id: "stew",
    category: "side",
    name: "차돌 된장찌개",
    desc: "고기 주문과 함께 많이 찾는 국물 메뉴",
    price: 8000,
    image: "",
    badge: "추천",
    soldOut: false,
  },
  {
    id: "egg",
    category: "side",
    name: "치즈 계란찜",
    desc: "부드러운 계란찜에 치즈를 올린 사이드",
    price: 6500,
    image: "",
    badge: "",
    soldOut: true,
  },
  {
    id: "soju",
    category: "drink",
    name: "소주",
    desc: "추가 주문이 잦은 기본 주류",
    price: 5000,
    image: "",
    badge: "",
    soldOut: false,
  },
  {
    id: "cola",
    category: "drink",
    name: "콜라",
    desc: "탄산음료",
    price: 2500,
    image: "",
    badge: "",
    soldOut: false,
  },
];

const state = {
  menu: loadMenu(),
  orders: loadOrders(),
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

function activeOrderKey() {
  const { store, table } = getTableInfo();
  return `${ACTIVE_ORDER_PREFIX}:${store}:${table}`;
}

function getMenuOptions(item) {
  if (item.category === "drink") return ["기본", "얼음 적게", "얼음 많이", "잔 추가"];
  if (item.category === "side") return ["기본", "덜 맵게", "맵게", "앞접시 필요"];
  return ["기본", "덜 익힘", "바싹 익힘", "쌈 채소 추가"];
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
  const { store, table } = getTableInfo();
  document.querySelector("#storeName").textContent = store;
  document.querySelector("#tableName").textContent = `${Number(table) || table}번 테이블`;

  bindCustomerEvents();
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
  renderCustomerMenu();
  renderPopularRail();
  renderCart();
  renderCurrentOrder();
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

function openMenuDetail(menuId) {
  const item = state.menu.find((entry) => entry.id === menuId);
  if (!item || item.soldOut) return;

  state.selectedMenuId = menuId;
  state.selectedOption = "기본";
  const sheet = document.querySelector("#menuDetail");
  const image = document.querySelector("#detailImage");
  const badge = document.querySelector("#detailBadge");
  const options = getMenuOptions(item);

  sheet.hidden = false;
  image.innerHTML = item.image
    ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)} 이미지" />`
    : `<span>${escapeHtml(categoryLabels[item.category])}</span>`;
  badge.hidden = !item.badge;
  badge.textContent = item.badge || "";
  document.querySelector("#detailTitle").textContent = item.name;
  document.querySelector("#detailDesc").textContent = item.desc;
  document.querySelector("#detailPrice").textContent = formatMoney(item.price);
  document.querySelector("#detailOptions").innerHTML = options
    .map(
      (option, index) => `
        <button class="${index === 0 ? "active" : ""}" type="button" data-option="${escapeAttr(option)}">
          ${escapeHtml(option)}
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
    <strong>빠른 담기</strong>
    <div>
      ${highlighted
        .map(
          (item) => `
            <button type="button" data-quick-add="${item.id}">
              <span>${escapeHtml(item.badge || categoryLabels[item.category])}</span>
              ${escapeHtml(item.name)}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderCustomerMenu() {
  const list = document.querySelector("#menuList");
  const filtered = state.menu.filter((item) => {
    const matchesCategory = state.activeCategory === "all" || item.category === state.activeCategory;
    const text = `${item.name} ${item.desc} ${item.badge || ""}`.toLowerCase();
    const matchesSearch = !state.searchQuery || text.includes(state.searchQuery);
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-menu">검색 결과가 없습니다.</div>';
    return;
  }

  list.innerHTML = filtered
    .map((item) => {
      const thumb = item.image
        ? `<img class="menu-thumb" src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)} 이미지" loading="lazy" />`
        : "";
      const badge = item.badge ? `<span class="menu-badge">${escapeHtml(item.badge)}</span>` : "";
      const category = `<span class="category-label">${categoryLabels[item.category]}</span>`;
      return `
        <article class="customer-menu-card ${item.image ? "has-image" : ""} ${item.soldOut ? "sold-out" : ""}">
          ${thumb}
          <div class="menu-copy">
            <div>
              <div class="menu-meta-line">${category}${badge}</div>
              <div class="menu-title-line">
                <h2>${escapeHtml(item.name)}${item.soldOut ? '<span class="sold-badge">품절</span>' : ""}</h2>
              </div>
              <p>${escapeHtml(item.desc)}</p>
            </div>
            <strong>${formatMoney(item.price)}</strong>
          </div>
          <div class="menu-actions">
            <button class="detail-button" type="button" data-detail="${item.id}" ${item.soldOut ? "disabled" : ""}>
              옵션
            </button>
            <button class="add-button" type="button" data-add="${item.id}" ${item.soldOut ? "disabled" : ""}>
              담기
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
    document.querySelector("#bottomCartCount").textContent = `${totalQty}개 담김`;
    document.querySelector("#bottomCartTotal").textContent = formatMoney(total);
  }
  renderRecommendations();

  if (state.cart.length === 0) {
    cartItems.className = "cart-items empty";
    cartItems.textContent = "담긴 메뉴가 없습니다.";
    return;
  }

  cartItems.className = "cart-items";
  cartItems.innerHTML = state.cart
    .map(
      (item) => {
        const lineId = item.lineId || item.id;
        const option = item.option && item.option !== "기본" ? `<small>${escapeHtml(item.option)}</small>` : "";
        return `
        <div class="cart-item">
          <div>
            <strong>${escapeHtml(item.name)}${option}</strong>
            <span>${formatMoney(item.price * item.qty)}</span>
          </div>
          <div class="cart-control">
            <button type="button" data-minus="${escapeAttr(lineId)}" aria-label="${escapeAttr(item.name)} 수량 줄이기">−</button>
            <span>${item.qty}</span>
            <button type="button" data-plus="${escapeAttr(lineId)}" aria-label="${escapeAttr(item.name)} 수량 늘리기">+</button>
            <button type="button" data-remove="${escapeAttr(lineId)}" aria-label="${escapeAttr(item.name)} 삭제">삭제</button>
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
    <strong>함께 담기 좋은 메뉴</strong>
    <div>
      ${recommended
        .map(
          (item) => `
            <button type="button" data-recommend-add="${item.id}">
              <span>${escapeHtml(item.name)}</span>
              <small>${formatMoney(item.price)}</small>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function placeOrder() {
  if (state.cart.length === 0 || state.orderLocked) return;
  state.orderLocked = true;
  document.querySelector("#placeOrder").disabled = true;

  const { store, table } = getTableInfo();
  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const note = document.querySelector("#orderNote").value.trim();
  const orderNo = String(Date.now()).slice(-6);
  const order = {
    id: makeId(),
    orderNo,
    store,
    table,
    items: state.cart.map((item) => ({ ...item })),
    total,
    note,
    status: "pending",
    createdAt: new Date(),
  };

  state.orders.unshift(order);
  saveOrders();
  localStorage.setItem(activeOrderKey(), order.id);
  state.cart = [];
  renderCart();
  renderCurrentOrder();

  showCompleteScreen();
  document.querySelector("#completeTitle").textContent = `${Number(table) || table}번 테이블 주문 접수`;
  document.querySelector("#completeMeta").textContent = `주문번호 ${orderNo}`;
  document.querySelector("#completeMessage").textContent = `합계 ${formatMoney(total)} 주문이 접수되었습니다. 직원이 확인 후 준비합니다.`;
  document.querySelector("#orderNote").value = "";
  startReturnCountdown();
  state.orderLocked = false;
}

function startReturnCountdown() {
  const countdown = document.querySelector("#returnCountdown");
  let remaining = 5;
  countdown.textContent = `${remaining}초 후 주문 화면으로 돌아갑니다.`;
  stopReturnCountdown();
  state.returnTimer = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      stopReturnCountdown();
      showOrderScreen();
      return;
    }
    countdown.textContent = `${remaining}초 후 주문 화면으로 돌아갑니다.`;
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
    .map((item) => `${item.name}${item.option && item.option !== "기본" ? `(${item.option})` : ""} ${item.qty}개`)
    .join(", ");

  panel.hidden = false;
  document.querySelector("#currentOrderTitle").textContent = `주문번호 ${order.orderNo || "-"}`;
  document.querySelector("#currentOrderStatus").textContent = statusLabels[order.status] || "접수";
  document.querySelector("#currentOrderItems").innerHTML = `
    <strong>${escapeHtml(itemText)}</strong>
    <span>${formatMoney(order.total)}</span>
  `;
  document.querySelectorAll("#progressSteps li").forEach((step, index) => {
    step.classList.toggle("is-done", index < currentIndex);
    step.classList.toggle("is-active", index === currentIndex);
  });
}

function requestService(serviceName) {
  const { store, table } = getTableInfo();
  const orderNo = String(Date.now()).slice(-6);
  const requestOrder = {
    id: makeId(),
    orderNo,
    store,
    table,
    items: [{ id: `service-${serviceName}`, name: `${serviceName} 요청`, price: 0, qty: 1 }],
    total: 0,
    note: `${serviceName} 부탁드립니다.`,
    status: "pending",
    service: true,
    createdAt: new Date(),
  };

  state.orders.unshift(requestOrder);
  saveOrders();

  const notice = document.querySelector("#serviceNotice");
  if (notice) {
    notice.textContent = `${serviceName} 요청을 보냈습니다.`;
    window.setTimeout(() => {
      if (notice.textContent.includes(serviceName)) notice.textContent = "";
    }, 2500);
  }
}

function initAdmin() {
  bindAdminEvents();
  syncKnownPendingOrders();
  renderAdmin();
  window.setInterval(refreshOrders, 1200);
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
}

function renderMetrics() {
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

  return `
    <article class="order-card ${order.status} ${waitClass}">
      <div class="order-card-head">
        <strong>${Number(order.table) || order.table}번 테이블</strong>
        <span>${serviceBadge}${formatMoney(order.total)}</span>
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

  if (order.status === "pending") order.status = "cooking";
  else if (order.status === "cooking") order.status = "served";
  else state.orders = state.orders.filter((entry) => entry.id !== orderId);

  saveOrders();
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
  item[field] = field === "price" ? Number(value) || 0 : value;
  saveMenu();
  if (pageType() === "admin") renderMetrics();
  if (shouldRender) renderMenuManager();
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

  state.menu.push({
    id: `menu-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category: String(formData.get("category") || "main"),
    name,
    desc: String(formData.get("desc") || "").trim() || "새 메뉴",
    price,
    image,
    badge: String(formData.get("badge") || "").trim(),
    soldOut: false,
  });
  saveMenu();
  form.reset();
  renderMenuManager();
}

function deleteMenuItem(id) {
  const item = state.menu.find((entry) => entry.id === id);
  if (!item) return;
  if (!confirm(`${item.name} 메뉴를 삭제할까요?`)) return;
  state.menu = state.menu.filter((entry) => entry.id !== id);
  saveMenu();
  renderMenuManager();
}

function moveMenuItem(id, direction) {
  const index = state.menu.findIndex((entry) => entry.id === id);
  if (index < 0) return;

  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= state.menu.length) return;

  const [item] = state.menu.splice(index, 1);
  state.menu.splice(nextIndex, 0, item);
  saveMenu();
  renderMenuManager();
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

  const order = {
    id: makeId(),
    store: "고깃집 온기",
    table: "05",
    items: selected,
    total,
    note: "앞접시 하나 더 부탁드립니다.",
    orderNo: String(Date.now()).slice(-6),
    status: "pending",
    createdAt: new Date(),
  };

  state.orders.unshift(order);
  saveOrders();
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
