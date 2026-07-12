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
const listingForm = document.getElementById("listingForm");
const listingOutput = document.getElementById("listingOutput");

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

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function splitList(value) {
  return String(value)
    .split(/[,，、;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function titleCase(value) {
  return String(value)
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function uniqueItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildEtsyTags(data) {
  const sourceTags = [
    data.name,
    ...splitList(data.material),
    ...splitList(data.color),
    ...splitList(data.useCase),
    ...splitList(data.audience),
    ...splitList(data.sellingPoints),
    "gift for her",
    "gift for him",
    "home decor",
    "handmade style",
    "desk accessory",
    "housewarming gift",
    "minimalist gift"
  ];
  const tags = uniqueItems(sourceTags)
    .map((tag) => tag.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 20))
    .filter((tag) => tag.length > 1)
    .slice(0, 13);
  const fallbackTags = ["small business", "etsy gift", "unique gift", "daily use", "custom style", "modern decor", "ready to ship"];
  for (const tag of fallbackTags) {
    if (tags.length >= 13) break;
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags.slice(0, 13);
}

function generateListingCopy(data) {
  const materials = splitList(data.material).join(", ") || data.material;
  const colors = splitList(data.color).join(", ") || data.color;
  const sellingPoints = splitList(data.sellingPoints);
  const primaryPoints = sellingPoints.length ? sellingPoints : [data.sellingPoints];
  const titleParts = uniqueItems([
    titleCase(data.name),
    titleCase(materials),
    titleCase(colors),
    titleCase(data.useCase),
    titleCase(data.audience),
    "Gift Ready"
  ]).filter(Boolean);
  const title = titleParts.join(" | ").slice(0, 140);
  const bulletPoints = primaryPoints.slice(0, 5).map((point) => `${point} for ${data.useCase}`);
  const tags = buildEtsyTags(data);
  const photoChecklist = [
    `Hero image showing the full ${data.name} on a clean background`,
    `Close-up of the ${materials} texture and finish`,
    `Scale photo showing size: ${data.size}`,
    `Color detail photo showing ${colors}`,
    `Lifestyle scene for ${data.useCase}`,
    `Photo of all packaging contents: ${data.package}`,
    `Gift-ready packaging or unboxing image`
  ];
  const packagingNotes = [
    `Protect the ${materials} surface with soft wrapping before placing it in the box.`,
    `Confirm the package includes: ${data.package}.`,
    `Add corner, edge, or void-fill protection if the item can move during transit.`,
    `Label fragile or keep-dry requirements only when they are true for this product.`,
    `Keep the final parcel weight close to ${data.weight} plus packaging for accurate shipping quotes.`
  ];
  const description = [
    `Bring a thoughtful, polished detail to ${data.useCase} with this ${data.name}.`,
    `It is made from ${materials}, comes in ${colors}, and is designed for ${data.audience}.`,
    `Size: ${data.size}. Weight: ${data.weight}.`,
    `Key features: ${primaryPoints.join("; ")}.`,
    `Package includes: ${data.package}.`,
    "Please review the size, color, and package details before ordering. This listing avoids unsupported claims and describes only visible, practical product features."
  ].join("\n\n");
  const chineseDescription = [
    `这款${data.name}适合${data.useCase}，目标客户为${data.audience}。`,
    `材质：${data.material}；尺寸：${data.size}；重量：${data.weight}；颜色：${data.color}。`,
    `核心卖点：${data.sellingPoints}。`,
    `包装内容：${data.package}。`,
    "文案只描述产品外观、材质、用途和包装信息，不包含治疗、招财、改善睡眠或其他无法证明的功效。"
  ].join("\n");
  return { title, bulletPoints, description, tags, photoChecklist, packagingNotes, chineseDescription };
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderListingOutput(copy) {
  listingOutput.innerHTML = `
    <div class="copy-card">
      <h3>1. Etsy英文商品标题</h3>
      <p>${escapeHtml(copy.title)}</p>
    </div>
    <div class="copy-card">
      <h3>2. 简短英文卖点</h3>
      ${renderList(copy.bulletPoints)}
    </div>
    <div class="copy-card">
      <h3>3. 完整英文商品描述</h3>
      <pre>${escapeHtml(copy.description)}</pre>
    </div>
    <div class="copy-card">
      <h3>4. 13个Etsy搜索标签</h3>
      <div class="tag-list">${copy.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    </div>
    <div class="copy-card">
      <h3>5. 图片拍摄清单</h3>
      ${renderList(copy.photoChecklist)}
    </div>
    <div class="copy-card">
      <h3>6. 包装注意事项</h3>
      ${renderList(copy.packagingNotes)}
    </div>
    <div class="copy-card">
      <h3>7. 中文版本说明</h3>
      <pre>${escapeHtml(copy.chineseDescription)}</pre>
    </div>
    <button class="secondary" type="button" id="copyListingBtn" data-copy="${escapeAttribute([
      copy.title,
      copy.bulletPoints.join("\\n"),
      copy.description,
      copy.tags.join(", "),
      copy.photoChecklist.join("\\n"),
      copy.packagingNotes.join("\\n"),
      copy.chineseDescription
    ].join("\\n\\n"))}">复制全部文案</button>
  `;
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

listingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!listingForm.reportValidity()) return;
  const data = {
    name: document.getElementById("listingName").value.trim(),
    material: document.getElementById("listingMaterial").value.trim(),
    size: document.getElementById("listingSize").value.trim(),
    weight: document.getElementById("listingWeight").value.trim(),
    color: document.getElementById("listingColor").value.trim(),
    useCase: document.getElementById("listingUseCase").value.trim(),
    package: document.getElementById("listingPackage").value.trim(),
    audience: document.getElementById("listingAudience").value.trim(),
    sellingPoints: document.getElementById("listingSellingPoints").value.trim()
  };
  renderListingOutput(generateListingCopy(data));
});

document.getElementById("clearListingBtn").addEventListener("click", () => {
  listingForm.reset();
  listingOutput.innerHTML = "";
});

listingOutput.addEventListener("click", async (event) => {
  if (event.target.id !== "copyListingBtn") return;
  await navigator.clipboard.writeText(event.target.dataset.copy);
  event.target.textContent = "已复制";
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
