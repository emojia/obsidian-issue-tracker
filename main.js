var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => IssueTrackerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  storageMode: "plugin-data",
  vaultFolderPath: "\u751F\u4EA7\u95EE\u9898\u5355"
};
var VIEW_TYPE_ISSUE_TRACKER = "issue-tracker-view";
var STATUS_OPTIONS = [
  "\u5F85\u5904\u7406",
  "\u5904\u7406\u4E2D",
  "\u5DF2\u89E3\u51B3",
  "\u5DF2\u5173\u95ED"
];
function formatOrdersHtml(orders) {
  if (orders.length === 0)
    return "-";
  return orders.map(
    (o, i) => `${o.orderNo}\uFF08\u5BA2\u6237: ${o.customer || "-"}, \u578B\u53F7: ${o.model || "-"}, \u6570\u91CF: ${o.quantity || "-"}\uFF09`
  ).join("<br>");
}
function formatOrdersText(orders) {
  if (orders.length === 0)
    return "\u65E0";
  return orders.map(
    (o, i) => `${o.orderNo}\uFF08\u5BA2\u6237: ${o.customer || "-"}, \u578B\u53F7: ${o.model || "-"}, \u6570\u91CF: ${o.quantity || "-"}\uFF09`
  ).join("\n");
}
var IssueModal = class extends import_obsidian.Modal {
  constructor(app, existingIssue, onSubmit) {
    super(app);
    this.issue = existingIssue;
    this.onSubmit = onSubmit;
    this.isEdit = existingIssue !== null;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", {
      text: this.isEdit ? "\u7F16\u8F91\u95EE\u9898\u5355" : "\u65B0\u5EFA\u95EE\u9898\u5355"
    });
    const form = contentEl.createDiv({ cls: "issue-form" });
    this.createField(form, "\u95EE\u9898\u6807\u9898 *", (container) => {
      this.titleInput = container.createEl("input", {
        type: "text",
        placeholder: "\u7B80\u77ED\u6982\u62EC\u95EE\u9898"
      });
      if (this.issue)
        this.titleInput.value = this.issue.title;
    });
    this.createField(form, "\u95EE\u9898\u63CF\u8FF0", (container) => {
      this.descTextarea = container.createEl("textarea", {
        placeholder: "\u8BE6\u7EC6\u63CF\u8FF0\u95EE\u9898\u53D1\u751F\u7684\u8FC7\u7A0B\u3001\u73B0\u8C61\u548C\u73AF\u5883",
        attr: { rows: "4" }
      });
      if (this.issue)
        this.descTextarea.value = this.issue.description;
    });
    this.createField(form, "\u53D1\u73B0\u4EBA *", (container) => {
      this.discovererInput = container.createEl("input", {
        type: "text",
        placeholder: "\u59D3\u540D"
      });
      if (this.issue)
        this.discovererInput.value = this.issue.discoverer;
    });
    this.createField(form, "\u76F8\u5173\u4EBA\u5458", (container) => {
      this.relatedInput = container.createEl("input", {
        type: "text",
        placeholder: "\u7528\u9017\u53F7\u5206\u9694\u591A\u4E2A\u59D3\u540D"
      });
      if (this.issue)
        this.relatedInput.value = this.issue.relatedPeople;
    });
    const ordersField = form.createDiv({ cls: "issue-field" });
    ordersField.createEl("label", { text: "\u53D7\u5F71\u54CD\u8BA2\u5355", cls: "issue-field-label" });
    this.ordersContainer = ordersField.createDiv({ cls: "issue-orders-container" });
    this.ordersData = this.issue ? this.issue.orders.map((o) => ({ ...o })) : [];
    if (this.ordersData.length === 0) {
      this.ordersData.push({ orderNo: "", customer: "", model: "", quantity: "" });
    }
    const renderOrders = () => {
      this.ordersContainer.empty();
      this.ordersData.forEach((order, idx) => {
        const entry = this.ordersContainer.createDiv({ cls: "issue-order-entry" });
        const header = entry.createDiv({ cls: "issue-order-header" });
        header.createSpan({ text: `\u8BA2\u5355 ${idx + 1}` });
        const row1 = entry.createDiv({ cls: "issue-order-row" });
        this.createInlineField(row1, "\u8BA2\u5355\u53F7", order.orderNo, (val) => {
          this.ordersData[idx].orderNo = val;
        });
        this.createInlineField(row1, "\u5BA2\u6237", order.customer, (val) => {
          this.ordersData[idx].customer = val;
        });
        const row2 = entry.createDiv({ cls: "issue-order-row" });
        this.createInlineField(row2, "\u578B\u53F7", order.model, (val) => {
          this.ordersData[idx].model = val;
        });
        this.createInlineField(row2, "\u6570\u91CF", order.quantity, (val) => {
          this.ordersData[idx].quantity = val;
        });
        if (this.ordersData.length > 1) {
          const delBtn = entry.createEl("button", {
            text: "\u5220\u9664",
            cls: "issue-btn-sm issue-btn-danger"
          });
          delBtn.addEventListener("click", () => {
            this.ordersData.splice(idx, 1);
            renderOrders();
          });
        }
      });
      const addBtn = this.ordersContainer.createEl("button", {
        text: "+ \u6DFB\u52A0\u8BA2\u5355",
        cls: "issue-btn-sm"
      });
      addBtn.addEventListener("click", () => {
        this.ordersData.push({ orderNo: "", customer: "", model: "", quantity: "" });
        renderOrders();
      });
    };
    renderOrders();
    this.createField(form, "\u89E3\u51B3\u8FDB\u5EA6", (container) => {
      this.statusSelect = container.createEl("select");
      STATUS_OPTIONS.forEach((s) => {
        const opt = this.statusSelect.createEl("option", { text: s });
        opt.value = s;
      });
      if (this.issue)
        this.statusSelect.value = this.issue.status;
    });
    this.createField(form, "\u662F\u5426\u5F71\u54CD\u751F\u4EA7", (container) => {
      const label = container.createEl("label", { cls: "checkbox-label" });
      this.affectsCheckbox = label.createEl("input", {
        type: "checkbox"
      });
      label.createSpan({ text: " \u662F\uFF0C\u5DF2\u5F71\u54CD\u7EBF\u4E0A\u73AF\u5883" });
      if (this.issue)
        this.affectsCheckbox.checked = this.issue.affectsProduction;
    });
    this.createField(form, "\u89E3\u51B3\u65B9\u6848", (container) => {
      this.solutionTextarea = container.createEl("textarea", {
        placeholder: "\u63CF\u8FF0\u5DF2\u91C7\u53D6\u6216\u8BA1\u5212\u4E2D\u7684\u89E3\u51B3\u65B9\u6848",
        attr: { rows: "3" }
      });
      if (this.issue)
        this.solutionTextarea.value = this.issue.solution;
    });
    const btnContainer = form.createDiv({ cls: "issue-form-buttons" });
    const saveBtn = btnContainer.createEl("button", {
      text: this.isEdit ? "\u4FDD\u5B58\u4FEE\u6539" : "\u521B\u5EFA\u95EE\u9898\u5355",
      cls: "mod-cta"
    });
    saveBtn.addEventListener("click", () => this.saveIssue());
    const cancelBtn = btnContainer.createEl("button", {
      text: "\u53D6\u6D88"
    });
    cancelBtn.addEventListener("click", () => this.close());
    this.titleInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveBtn.click();
      }
    });
  }
  createField(container, label, contentFn) {
    const field = container.createDiv({ cls: "issue-field" });
    field.createEl("label", { text: label, cls: "issue-field-label" });
    const inputContainer = field.createDiv({ cls: "issue-field-input" });
    contentFn(inputContainer);
  }
  createInlineField(container, label, value, onChange) {
    const field = container.createDiv({ cls: "issue-inline-field" });
    field.createEl("span", { text: label, cls: "issue-inline-label" });
    const input = field.createEl("input", {
      type: "text",
      placeholder: label
    });
    input.value = value;
    input.addEventListener("input", () => onChange(input.value));
  }
  /** 从 ordersData 获取订单列表 */
  collectOrders() {
    return this.ordersData.filter((o) => o.orderNo.trim().length > 0);
  }
  saveIssue() {
    var _a, _b, _c, _d;
    const title = this.titleInput.value.trim();
    const discoverer = this.discovererInput.value.trim();
    if (!title) {
      new import_obsidian.Notice("\u8BF7\u8F93\u5165\u95EE\u9898\u6807\u9898");
      return;
    }
    if (!discoverer) {
      new import_obsidian.Notice("\u8BF7\u8F93\u5165\u53D1\u73B0\u4EBA\u59D3\u540D");
      return;
    }
    const now = (0, import_obsidian.moment)().format("YYYY-MM-DD HH:mm:ss");
    const issue = {
      id: (_b = (_a = this.issue) == null ? void 0 : _a.id) != null ? _b : this.generateId(),
      title,
      description: this.descTextarea.value.trim(),
      discoverer,
      relatedPeople: this.relatedInput.value.trim(),
      orders: this.ordersData.filter((o) => o.orderNo.trim().length > 0),
      status: this.statusSelect.value,
      affectsProduction: this.affectsCheckbox.checked,
      solution: this.solutionTextarea.value.trim(),
      createdAt: (_d = (_c = this.issue) == null ? void 0 : _c.createdAt) != null ? _d : now,
      updatedAt: now
    };
    this.onSubmit(issue);
    this.close();
  }
  generateId() {
    return "ISSUE-" + Date.now().toString(36).toUpperCase();
  }
};
var IssueTrackerView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_ISSUE_TRACKER;
  }
  getDisplayText() {
    return "\u95EE\u9898\u5355\u8FFD\u8E2A\u5668";
  }
  getIcon() {
    return "list-checks";
  }
  async onOpen() {
    this.container = this.contentEl;
    this.render();
  }
  async render() {
    const { container } = this;
    container.empty();
    const header = container.createDiv({ cls: "issue-header" });
    header.createEl("h2", { text: "\u751F\u4EA7\u95EE\u9898\u5355\u6C47\u603B" });
    const issues = this.plugin.getIssues();
    const stats = container.createDiv({ cls: "issue-stats" });
    const totalCount = issues.length;
    const pendingCount = issues.filter((i) => i.status === "\u5F85\u5904\u7406").length;
    const inProgressCount = issues.filter((i) => i.status === "\u5904\u7406\u4E2D").length;
    const resolvedCount = issues.filter((i) => i.status === "\u5DF2\u89E3\u51B3").length;
    const productionImpactCount = issues.filter(
      (i) => i.affectsProduction
    ).length;
    stats.createSpan({
      text: `\u5171 ${totalCount} \u6761  |  \u5F85\u5904\u7406 ${pendingCount}  |  \u5904\u7406\u4E2D ${inProgressCount}  |  \u5DF2\u89E3\u51B3 ${resolvedCount}  |  \u5F71\u54CD\u751F\u4EA7 ${productionImpactCount}`
    });
    const toolbar = container.createDiv({ cls: "issue-toolbar" });
    const addBtn = toolbar.createEl("button", {
      text: "\uFF0B \u65B0\u5EFA\u95EE\u9898\u5355",
      cls: "mod-cta"
    });
    addBtn.addEventListener("click", () => this.openNewIssueModal());
    const exportBtn = toolbar.createEl("button", {
      text: "\u{1F4E4} \u5BFC\u51FA Markdown"
    });
    exportBtn.addEventListener("click", () => this.exportToMarkdown());
    const filterBar = container.createDiv({ cls: "issue-filter-bar" });
    const searchInput = filterBar.createEl("input", {
      type: "text",
      placeholder: "\u641C\u7D22\u6807\u9898\u3001\u63CF\u8FF0\u3001\u53D1\u73B0\u4EBA...",
      cls: "issue-search-input"
    });
    const statusFilter = filterBar.createEl("select", { cls: "issue-filter-select" });
    const allOpt = statusFilter.createEl("option", { text: "\u5168\u90E8\u72B6\u6001" });
    allOpt.value = "";
    STATUS_OPTIONS.forEach((s) => {
      const opt = statusFilter.createEl("option", { text: s });
      opt.value = s;
    });
    const prodFilter = filterBar.createEl("select", { cls: "issue-filter-select" });
    const allProd = prodFilter.createEl("option", { text: "\u5168\u90E8\u5F71\u54CD\u8303\u56F4" });
    allProd.value = "";
    const yesProd = prodFilter.createEl("option", { text: "\u5F71\u54CD\u751F\u4EA7" });
    yesProd.value = "yes";
    const noProd = prodFilter.createEl("option", { text: "\u672A\u5F71\u54CD\u751F\u4EA7" });
    noProd.value = "no";
    const tableContainer = container.createDiv({ cls: "issue-table-container" });
    const renderTable = () => {
      tableContainer.empty();
      const keyword = searchInput.value.trim().toLowerCase();
      const statusVal = statusFilter.value;
      const prodVal = prodFilter.value;
      let filtered = issues;
      if (keyword) {
        filtered = filtered.filter(
          (i) => i.title.toLowerCase().includes(keyword) || i.description.toLowerCase().includes(keyword) || i.discoverer.toLowerCase().includes(keyword) || i.relatedPeople.toLowerCase().includes(keyword)
        );
      }
      if (statusVal) {
        filtered = filtered.filter((i) => i.status === statusVal);
      }
      if (prodVal === "yes") {
        filtered = filtered.filter((i) => i.affectsProduction);
      } else if (prodVal === "no") {
        filtered = filtered.filter((i) => !i.affectsProduction);
      }
      if (filtered.length === 0) {
        tableContainer.createEl("div", {
          text: "\u6682\u65E0\u5339\u914D\u7684\u95EE\u9898\u5355\uFF0C\u70B9\u51FB\u4E0A\u65B9\u6309\u94AE\u65B0\u5EFA",
          cls: "issue-empty"
        });
        return;
      }
      const table = tableContainer.createEl("table", { cls: "issue-table" });
      const thead = table.createEl("thead");
      const headerRow = thead.createEl("tr");
      const headers = [
        "\u6807\u9898",
        "\u53D1\u73B0\u4EBA",
        "\u53D7\u5F71\u54CD\u8BA2\u5355",
        "\u8FDB\u5EA6",
        "\u5F71\u54CD\u751F\u4EA7",
        "\u521B\u5EFA\u65F6\u95F4",
        "\u64CD\u4F5C"
      ];
      headers.forEach((h) => headerRow.createEl("th", { text: h }));
      const tbody = table.createEl("tbody");
      filtered.sort(
        (a, b) => (0, import_obsidian.moment)(b.updatedAt).valueOf() - (0, import_obsidian.moment)(a.updatedAt).valueOf()
      ).forEach((issue) => {
        const row = tbody.createEl("tr");
        row.createEl("td", { text: issue.title, cls: "issue-cell-title" });
        row.createEl("td", { text: issue.discoverer });
        row.createEl("td", { cls: "issue-cell-orders" }).innerHTML = formatOrdersHtml(issue.orders);
        const statusCell = row.createEl("td");
        const statusBadge = statusCell.createEl("span", {
          text: issue.status,
          cls: `issue-status-badge issue-status-${issue.status}`
        });
        const prodCell = row.createEl("td");
        const prodBadge = prodCell.createEl("span", {
          text: issue.affectsProduction ? "\u662F" : "\u5426",
          cls: issue.affectsProduction ? "issue-prod-yes" : "issue-prod-no"
        });
        row.createEl("td", { text: issue.createdAt });
        const actionCell = row.createEl("td", { cls: "issue-action-cell" });
        const viewBtn = actionCell.createEl("button", {
          text: "\u8BE6\u60C5",
          cls: "issue-btn-sm"
        });
        viewBtn.addEventListener(
          "click",
          () => this.openDetailModal(issue)
        );
        const editBtn = actionCell.createEl("button", {
          text: "\u7F16\u8F91",
          cls: "issue-btn-sm"
        });
        editBtn.addEventListener(
          "click",
          () => this.openEditModal(issue)
        );
        const delBtn = actionCell.createEl("button", {
          text: "\u5220\u9664",
          cls: "issue-btn-sm issue-btn-danger"
        });
        delBtn.addEventListener(
          "click",
          () => this.deleteIssue(issue)
        );
      });
    };
    searchInput.addEventListener("input", renderTable);
    statusFilter.addEventListener("change", renderTable);
    prodFilter.addEventListener("change", renderTable);
    renderTable();
  }
  openNewIssueModal() {
    new IssueModal(this.app, null, (issue) => {
      this.plugin.addIssue(issue);
      new import_obsidian.Notice("\u95EE\u9898\u5355\u5DF2\u521B\u5EFA");
      this.render();
    }).open();
  }
  openEditModal(issue) {
    new IssueModal(this.app, issue, (updated) => {
      this.plugin.updateIssue(updated);
      new import_obsidian.Notice("\u95EE\u9898\u5355\u5DF2\u66F4\u65B0");
      this.render();
    }).open();
  }
  openDetailModal(issue) {
    const modal = new import_obsidian.Modal(this.app);
    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass("issue-detail-modal");
      contentEl.createEl("h2", { text: issue.title });
      const detail = contentEl.createDiv({ cls: "issue-detail" });
      this.addDetailRow(detail, "\u95EE\u9898\u63CF\u8FF0", issue.description || "\u65E0");
      this.addDetailRow(detail, "\u53D1\u73B0\u4EBA", issue.discoverer);
      this.addDetailRow(detail, "\u76F8\u5173\u4EBA\u5458", issue.relatedPeople || "\u65E0");
      this.addDetailRow(detail, "\u53D7\u5F71\u54CD\u8BA2\u5355", formatOrdersText(issue.orders));
      this.addDetailRow(detail, "\u89E3\u51B3\u8FDB\u5EA6", issue.status);
      this.addDetailRow(
        detail,
        "\u662F\u5426\u5F71\u54CD\u751F\u4EA7",
        issue.affectsProduction ? "\u662F" : "\u5426"
      );
      this.addDetailRow(detail, "\u89E3\u51B3\u65B9\u6848", issue.solution || "\u6682\u65E0");
      this.addDetailRow(detail, "\u521B\u5EFA\u65F6\u95F4", issue.createdAt);
      this.addDetailRow(detail, "\u6700\u540E\u66F4\u65B0", issue.updatedAt);
      const closeBtn = contentEl.createEl("button", {
        text: "\u5173\u95ED",
        cls: "mod-cta"
      });
      closeBtn.addEventListener("click", () => modal.close());
    };
    modal.open();
  }
  addDetailRow(container, label, value) {
    const row = container.createDiv({ cls: "issue-detail-row" });
    row.createEl("span", { text: label, cls: "issue-detail-label" });
    row.createEl("span", { text: value, cls: "issue-detail-value" });
  }
  deleteIssue(issue) {
    const confirmed = window.confirm(
      `\u786E\u5B9A\u8981\u5220\u9664\u95EE\u9898\u5355\u300C${issue.title}\u300D\u5417\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002`
    );
    if (!confirmed)
      return;
    this.plugin.removeIssue(issue.id);
    new import_obsidian.Notice("\u95EE\u9898\u5355\u5DF2\u5220\u9664");
    this.render();
  }
  async exportToMarkdown() {
    const issues = this.plugin.getIssues();
    if (issues.length === 0) {
      new import_obsidian.Notice("\u6CA1\u6709\u95EE\u9898\u5355\u53EF\u5BFC\u51FA");
      return;
    }
    let md = "# \u751F\u4EA7\u95EE\u9898\u5355\u6C47\u603B\u62A5\u544A\n\n";
    md += `> \u5BFC\u51FA\u65F6\u95F4\uFF1A${(0, import_obsidian.moment)().format("YYYY-MM-DD HH:mm:ss")}

`;
    md += `| \u6807\u9898 | \u53D1\u73B0\u4EBA | \u53D7\u5F71\u54CD\u8BA2\u5355 | \u8FDB\u5EA6 | \u5F71\u54CD\u751F\u4EA7 | \u89E3\u51B3\u65B9\u6848 | \u521B\u5EFA\u65F6\u95F4 |
`;
    md += `|------|--------|------------|------|----------|----------|----------|
`;
    issues.sort(
      (a, b) => (0, import_obsidian.moment)(b.updatedAt).valueOf() - (0, import_obsidian.moment)(a.updatedAt).valueOf()
    ).forEach((i) => {
      md += `| ${i.title} | ${i.discoverer} | ${i.orders.map((o) => o.orderNo + "\uFF08\u5BA2\u6237:" + (o.customer || "-") + " \u578B\u53F7:" + (o.model || "-") + " \u6570\u91CF:" + (o.quantity || "-") + "\uFF09").join("<br>") || "-"} | ${i.status} | ${i.affectsProduction ? "\u662F" : "\u5426"} | ${i.solution || "-"} | ${i.createdAt} |
`;
    });
    md += "\n---\n\n## \u95EE\u9898\u8BE6\u60C5\n\n";
    issues.sort(
      (a, b) => (0, import_obsidian.moment)(b.updatedAt).valueOf() - (0, import_obsidian.moment)(a.updatedAt).valueOf()
    ).forEach((i, idx) => {
      md += `### ${idx + 1}. ${i.title}

`;
      md += `- **\u95EE\u9898ID**: ${i.id}
`;
      md += `- **\u53D1\u73B0\u4EBA**: ${i.discoverer}
`;
      md += `- **\u76F8\u5173\u4EBA\u5458**: ${i.relatedPeople || "\u65E0"}
`;
      md += `- **\u53D7\u5F71\u54CD\u8BA2\u5355**:
`;
      if (i.orders.length === 0) {
        md += `  \u65E0
`;
      } else {
        i.orders.forEach((o) => {
          md += `  - ${o.orderNo}\uFF08\u5BA2\u6237: ${o.customer || "-"}, \u578B\u53F7: ${o.model || "-"}, \u6570\u91CF: ${o.quantity || "-"}\uFF09
`;
        });
      }
      md += `- **\u5BA2\u6237**: ${i.customer || "\u65E0"}
`;
      md += `- **\u578B\u53F7**: ${i.model || "\u65E0"}
`;
      md += `- **\u6570\u91CF**: ${i.quantity || "\u65E0"}
`;
      md += `- **\u8FDB\u5EA6**: ${i.status}
`;
      md += `- **\u5F71\u54CD\u751F\u4EA7**: ${i.affectsProduction ? "\u662F" : "\u5426"}
`;
      md += `- **\u95EE\u9898\u63CF\u8FF0**: ${i.description || "\u65E0"}
`;
      md += `- **\u89E3\u51B3\u65B9\u6848**: ${i.solution || "\u6682\u65E0"}
`;
      md += `- **\u521B\u5EFA\u65F6\u95F4**: ${i.createdAt}
`;
      md += `- **\u6700\u540E\u66F4\u65B0**: ${i.updatedAt}

`;
    });
    const fileName = `\u95EE\u9898\u5355\u62A5\u544A_${(0, import_obsidian.moment)().format("YYYYMMDD_HHmmss")}.md`;
    try {
      const filePath = (0, import_obsidian.normalizePath)(fileName);
      await this.app.vault.create(filePath, md);
      new import_obsidian.Notice(`\u5DF2\u5BFC\u51FA\u5230 ${fileName}`);
    } catch (e) {
      new import_obsidian.Notice("\u5BFC\u51FA\u5931\u8D25: " + e.message);
    }
  }
};
var IssueTrackerSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "\u95EE\u9898\u5355\u8FFD\u8E2A\u5668 - \u8BBE\u7F6E" });
    new import_obsidian.Setting(containerEl).setName("\u6570\u636E\u5B58\u50A8\u65B9\u5F0F").setDesc("\u9009\u62E9\u95EE\u9898\u5355\u6570\u636E\u7684\u5B58\u50A8\u4F4D\u7F6E").addDropdown(
      (dropdown) => dropdown.addOption("plugin-data", "\u63D2\u4EF6\u6570\u636E\u76EE\u5F55\uFF08\u9ED8\u8BA4\uFF09").addOption("vault-folder", "Vault \u6587\u4EF6\u5939\uFF08\u751F\u6210 Markdown \u6587\u4EF6\uFF09").setValue(this.plugin.settings.storageMode).onChange(async (value) => {
        this.plugin.settings.storageMode = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Vault \u6587\u4EF6\u5939\u8DEF\u5F84").setDesc("\u5F53\u5B58\u50A8\u65B9\u5F0F\u4E3A\u300CVault \u6587\u4EF6\u5939\u300D\u65F6\uFF0C\u6307\u5B9A\u5B58\u653E\u95EE\u9898\u5355 Markdown \u6587\u4EF6\u7684\u8DEF\u5F84").addText(
      (text) => text.setPlaceholder("\u751F\u4EA7\u95EE\u9898\u5355").setValue(this.plugin.settings.vaultFolderPath).onChange(async (value) => {
        this.plugin.settings.vaultFolderPath = value;
        await this.plugin.saveSettings();
      })
    );
  }
};
var IssueTrackerPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.issues = [];
  }
  async onload() {
    await this.loadSettings();
    await this.loadIssues();
    this.registerView(
      VIEW_TYPE_ISSUE_TRACKER,
      (leaf) => new IssueTrackerView(leaf, this)
    );
    this.addRibbonIcon("list-checks", "\u6253\u5F00\u95EE\u9898\u5355\u8FFD\u8E2A\u5668", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-issue-tracker",
      name: "\u6253\u5F00\u95EE\u9898\u5355\u8FFD\u8E2A\u5668",
      callback: () => this.activateView()
    });
    this.addCommand({
      id: "create-new-issue",
      name: "\u65B0\u5EFA\u95EE\u9898\u5355",
      callback: () => {
        this.activateView();
        setTimeout(() => {
          const leaves = this.app.workspace.getLeavesOfType(
            VIEW_TYPE_ISSUE_TRACKER
          );
          if (leaves.length > 0) {
            const view = leaves[0].view;
            new IssueModal(this.app, null, (issue) => {
              this.addIssue(issue);
              new import_obsidian.Notice("\u95EE\u9898\u5355\u5DF2\u521B\u5EFA");
              view.render();
            }).open();
          }
        }, 200);
      }
    });
    this.addSettingTab(new IssueTrackerSettingTab(this.app, this));
    if (this.app.workspace.getLeavesOfType(VIEW_TYPE_ISSUE_TRACKER).length === 0) {
      this.app.workspace.onLayoutReady(() => {
        this.activateView();
      });
    }
  }
  onunload() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE_ISSUE_TRACKER).forEach((leaf) => leaf.detach());
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_ISSUE_TRACKER).first();
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      if (!leaf) {
        leaf = workspace.getLeaf(true);
      }
      await leaf.setViewState({ type: VIEW_TYPE_ISSUE_TRACKER, active: true });
    }
    workspace.revealLeaf(leaf);
  }
  // =========================
  // Issue CRUD
  // =========================
  getIssues() {
    return this.issues;
  }
  addIssue(issue) {
    this.issues.push(issue);
    this.saveIssues();
  }
  updateIssue(updated) {
    const idx = this.issues.findIndex((i) => i.id === updated.id);
    if (idx !== -1) {
      this.issues[idx] = updated;
      this.saveIssues();
    }
  }
  removeIssue(id) {
    this.issues = this.issues.filter((i) => i.id !== id);
    this.saveIssues();
  }
  // =========================
  // Data Persistence
  // =========================
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async loadIssues() {
    var _a;
    const data = await this.loadData();
    this.issues = (_a = data == null ? void 0 : data.issues) != null ? _a : [];
  }
  async saveIssues() {
    const data = await this.loadData();
    await this.saveData({
      ...data,
      issues: this.issues
    });
    if (this.settings.storageMode === "vault-folder") {
      await this.syncToVaultFolder();
    }
  }
  async syncToVaultFolder() {
    const folderPath = (0, import_obsidian.normalizePath)(this.settings.vaultFolderPath);
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!folder) {
      await this.app.vault.createFolder(folderPath);
    }
    const existingFiles = this.app.vault.getFiles().filter(
      (f) => f.path.startsWith(folderPath + "/") && f.name.startsWith("issue-")
    );
    for (const f of existingFiles) {
      await this.app.vault.delete(f);
    }
    for (const issue of this.issues) {
      const safeName = issue.title.replace(/[\\/:*?"<>|]/g, "_").substring(0, 50);
      const fileName = `issue-${issue.id}-${safeName}.md`;
      const filePath = (0, import_obsidian.normalizePath)(`${folderPath}/${fileName}`);
      let md = `---
`;
      md += `id: ${issue.id}
`;
      md += `title: "${issue.title}"
`;
      md += `discoverer: ${issue.discoverer}
`;
      md += `relatedPeople: "${issue.relatedPeople}"
`;
      md += `orders:
`;
      issue.orders.forEach((o) => {
        md += `  - orderNo: "${o.orderNo}"
`;
        md += `    customer: "${o.customer}"
`;
        md += `    model: "${o.model}"
`;
        md += `    quantity: "${o.quantity}"
`;
      });
      md += `status: ${issue.status}
`;
      md += `affectsProduction: ${issue.affectsProduction}
`;
      md += `createdAt: ${issue.createdAt}
`;
      md += `updatedAt: ${issue.updatedAt}
`;
      md += `---

`;
      md += `# ${issue.title}

`;
      md += `## \u95EE\u9898\u63CF\u8FF0

${issue.description || "\u65E0"}

`;
      md += `## \u89E3\u51B3\u65B9\u6848

${issue.solution || "\u6682\u65E0"}

`;
      md += `## \u5143\u6570\u636E

`;
      md += `- **\u95EE\u9898ID**: ${issue.id}
`;
      md += `- **\u53D1\u73B0\u4EBA**: ${issue.discoverer}
`;
      md += `- **\u76F8\u5173\u4EBA\u5458**: ${issue.relatedPeople || "\u65E0"}
`;
      const vaultOrderItems = splitOrders(issue.affectedOrder);
      if (vaultOrderItems.length === 0) {
        md += `- **\u53D7\u5F71\u54CD\u8BA2\u5355**: \u65E0
`;
      } else {
        md += `- **\u53D7\u5F71\u54CD\u8BA2\u5355**:
`;
        vaultOrderItems.forEach((o) => {
          md += `  - ${o}
`;
        });
      }
      md += `- **\u5BA2\u6237**: ${issue.customer || "\u65E0"}
`;
      md += `- **\u578B\u53F7**: ${issue.model || "\u65E0"}
`;
      md += `- **\u6570\u91CF**: ${issue.quantity || "\u65E0"}
`;
      md += `- **\u8FDB\u5EA6**: ${issue.status}
`;
      md += `- **\u5F71\u54CD\u751F\u4EA7**: ${issue.affectsProduction ? "\u662F" : "\u5426"}
`;
      md += `- **\u521B\u5EFA\u65F6\u95F4**: ${issue.createdAt}
`;
      md += `- **\u6700\u540E\u66F4\u65B0**: ${issue.updatedAt}
`;
      await this.app.vault.create(filePath, md);
    }
  }
};
