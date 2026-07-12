const STORAGE_KEY = "crossBorderProfitProducts";
const fields = [
  "name", "purchaseCny", "exchangeRate", "domesticFreightCny", "internationalFreightAud",
  "localDeliveryAud", "packagingAud", "salePriceAud", "commissionRate", "adCostAud", "gstRate", "returnLossRate"
];

let products = loadProducts();

const form = document.getElementById("productForm");
const tableBody = document.getElementById("productTable");
const emptyState = document.getElementById("emptyState");
const tableWrap = document.getElementById("tableWrap");
const productCount = document.getElementById("productCount");
const submitBtn = document.getElementById("submitBtn");
const currentResult = document.getElementById("currentResult");

function toNumber(value) { return Number.parseFloat(value) || 0; }
function money(value) { return `$${value.toFixed(2)}`; }
function percent(value) { return `${value.toFixed(2)}%`; }
function saveProducts() { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); }
function loadProducts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function makeId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `product-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function sampleProducts() {
  return [
    { id: makeId(), name: "水晶桌面摆件", purchaseCny: 160, exchangeRate: 4.71, domesticFreightCny: 5, internationalFreightAud: 8, localDeliveryAud: 10, packagingAud: 2, salePriceAud: 49.95, commissionRate: 12, adCostAud: 5, gstRate: 10, returnLossRate: 5 },
    { id: makeId(), name: "手机支架", purchaseCny: 18, exchangeRate: 4.8, domesticFreightCny: 3, internationalFreightAud: 2.4, localDeliveryAud: 5.8, packagingAud: 0.6, salePriceAud: 12.99, commissionRate: 12, adCostAud: 3.5, gstRate: 10, returnLossRate: 4 }
  ];
}

function calculate(product) {
  const purchaseAud = (product.purchaseCny + product.domesticFreightCny) / product.exchangeRate;
  const landingCost = purchaseAud + product.internationalFreightAud + product.localDeliveryAud + product.packagingAud;
  const commission = product.salePriceAud * product.commissionRate / 100;
  const gst = product.salePriceAud * product.gstRate / 100;
  const returnLoss = product.salePriceAud * product.returnLossRate / 100;
  const netProfit = product.salePriceAud - landingCost - commission - gst - product.adCostAud - returnLoss;
  const netMargin = product.salePriceAud > 0 ? netProfit / product.salePriceAud * 100 : 0;
  const variableRate = (product.commissionRate + product.gstRate + product.returnLossRate) / 100;
  const breakEvenPrice = variableRate < 1 ? (landingCost + product.adCostAud) / (1 - variableRate) : 0;
  const maxAdCost = product.salePriceAud - landingCost - commission - gst - returnLoss;
  return { purchaseAud, landingCost, commission, gst, netProfit, netMargin, breakEvenPrice, maxAdCost };
}

function renderCurrentResult(product) {
  const result = calculate(product);
  const profitClass = result.netProfit < 0 ? "loss-text" : "";
  currentResult.innerHTML = `
    <div class="result-card"><span>澳元采购成本</span><strong>${money(result.purchaseAud)}</strong></div>
    <div class="result-card"><span>产品落地成本</span><strong>${money(result.landingCost)}</strong></div>
    <div class="result-card"><span>平台佣金</span><strong>${money(result.commission)}</strong></div>
    <div class="result-card"><span>GST金额</span><strong>${money(result.gst)}</strong></div>
    <div class="result-card"><span>预计净利润</span><strong class="${profitClass}">${money(result.netProfit)}</strong></div>
    <div class="result-card"><span>净利润率</span><strong class="${profitClass}">${percent(result.netMargin)}</strong></div>
    <div class="result-card"><span>盈亏平衡售价</span><strong>${money(result.breakEvenPrice)}</strong></div>
    <div class="result-card"><span>最大可接受广告成本</span><strong class="${result.maxAdCost < 0 ? "loss-text" : ""}">${money(result.maxAdCost)}</strong></div>
  `;
}

function render() {
  productCount.textContent = `${products.length} 个产品`;
  emptyState.hidden = products.length > 0;
  tableWrap.hidden = products.length === 0;
  tableBody.innerHTML = products.map((product) => {
    const result = calculate(product);
    const lossClass = result.netProfit < 0 ? "loss-row" : "";
    const profitClass = result.netProfit < 0 ? "loss-text" : "";
    return `<tr class="${lossClass}">
      <td><strong>${escapeHtml(product.name)}</strong>${result.netProfit < 0 ? "<br><span class='loss-text'>⚠ 亏损预警</span>" : ""}</td>
      <td>${money(result.purchaseAud)}</td>
      <td>${money(result.landingCost)}</td>
      <td>${money(result.commission)}</td>
      <td>${money(result.gst)}</td>
      <td class="${profitClass}">${money(result.netProfit)}</td>
      <td class="${profitClass}">${percent(result.netMargin)}</td>
      <td>${money(result.breakEvenPrice)}</td>
      <td class="${result.maxAdCost < 0 ? "loss-text" : ""}">${money(result.maxAdCost)}</td>
      <td><div class="row-actions"><button class="small-btn" onclick="editProduct('${product.id}')">编辑</button><button class="small-btn delete-btn" onclick="deleteProduct('${product.id}')">删除</button></div></td>
    </tr>`;
  }).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function readForm() {
  const product = { id: document.getElementById("editingId").value || makeId() };
  fields.forEach((field) => {
    product[field] = field === "name" ? document.getElementById(field).value.trim() : toNumber(document.getElementById(field).value);
  });
  return product;
}

function fillForm(product) {
  document.getElementById("editingId").value = product.id || "";
  fields.forEach((field) => { document.getElementById(field).value = product[field] ?? ""; });
  submitBtn.textContent = product.id ? "保存修改" : "保存产品";
  renderCurrentResult(product);
}

function resetForm() {
  form.reset();
  document.getElementById("editingId").value = "";
  submitBtn.textContent = "保存产品";
  currentResult.innerHTML = "";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const product = readForm();
  const index = products.findIndex((item) => item.id === product.id);
  if (index >= 0) products[index] = product;
  else products.push(product);
  saveProducts();
  render();
  resetForm();
});

document.getElementById("calculateBtn").addEventListener("click", () => {
  if (!form.reportValidity()) return;
  renderCurrentResult(readForm());
});

document.getElementById("resetBtn").addEventListener("click", resetForm);

document.getElementById("loadSampleBtn").addEventListener("click", () => {
  products = sampleProducts();
  saveProducts();
  render();
  fillForm(products[0]);
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const headers = ["产品名称", "澳元采购成本", "产品落地成本", "平台佣金", "GST金额", "预计净利润", "净利润率", "盈亏平衡售价", "最大可接受广告成本"];
  const rows = products.map((product) => {
    const result = calculate(product);
    return [product.name, result.purchaseAud, result.landingCost, result.commission, result.gst, result.netProfit, `${result.netMargin}%`, result.breakEvenPrice, result.maxAdCost];
  });
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "跨境电商利润计算.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});

window.editProduct = function editProduct(id) {
  const product = products.find((item) => item.id === id);
  if (product) { fillForm(product); window.scrollTo({ top: 0, behavior: "smooth" }); }
};

window.deleteProduct = function deleteProduct(id) {
  products = products.filter((item) => item.id !== id);
  saveProducts();
  render();
};

if (products.length === 0) {
  products = [sampleProducts()[0]];
  saveProducts();
}
render();
fillForm(products[0]);
