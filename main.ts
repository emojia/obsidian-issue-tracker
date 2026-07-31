import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  ItemView,
  WorkspaceLeaf,
  Modal,
  Notice,
  TFile,
  TFolder,
  normalizePath,
  moment,
} from "obsidian";

// =========================
// Types & Interfaces
// =========================

interface OrderEntry {
  orderNo: string;
  customer: string;
  model: string;
  quantity: string;
}

interface Issue {
  id: string;
  title: string;
  description: string;
  discoverer: string;
  relatedPeople: string;
  orders: OrderEntry[];
  images: string[];
  status: "待处理" | "处理中" | "已解决" | "已关闭";
  affectsProduction: boolean;
  solution: string;
  createdAt: string;
  updatedAt: string;
}

interface IssueTrackerSettings {
  /** 数据存储方式: "plugin-data" | "vault-folder" */
  storageMode: "plugin-data" | "vault-folder";
  /** 当 storageMode 为 vault-folder 时，存放 issue md 文件的文件夹路径 */
  vaultFolderPath: string;
}

const DEFAULT_SETTINGS: IssueTrackerSettings = {
  storageMode: "plugin-data",
  vaultFolderPath: "生产问题单",
};

// =========================
// Constants
// =========================

const VIEW_TYPE_ISSUE_TRACKER = "issue-tracker-view";
const PLUGIN_DATA_KEY = "issues";

const STATUS_OPTIONS: Issue["status"][] = [
  "待处理",
  "处理中",
  "已解决",
  "已关闭",
];

// =========================
// Utility: 格式化多订单
// =========================

/** 将订单数组转为 HTML 换行格式（用于表格单元格） */
function formatOrdersHtml(orders: OrderEntry[]): string {
  if (orders.length === 0) return "-";
  return orders
    .map(
      (o, i) =>
        `${o.orderNo}（客户: ${o.customer || "-"}, 型号: ${o.model || "-"}, 数量: ${o.quantity || "-"}）`
    )
    .join("<br>");
}

/** 将订单数组转为换行文本（用于详情弹窗） */
function formatOrdersText(orders: OrderEntry[]): string {
  if (orders.length === 0) return "无";
  return orders
    .map(
      (o, i) =>
        `${o.orderNo}（客户: ${o.customer || "-"}, 型号: ${o.model || "-"}, 数量: ${o.quantity || "-"}）`
    )
    .join("\n");
}

// =========================
// Modal: 新增 / 编辑 Issue
// =========================
// =========================

class IssueModal extends Modal {
  private issue: Issue | null;
  private onSubmit: (issue: Issue) => void;
  private isEdit: boolean;

  // form 元素
  private titleInput: HTMLInputElement;
  private descTextarea: HTMLTextAreaElement;
  private discovererInput: HTMLInputElement;
  private relatedInput: HTMLInputElement;
  private ordersContainer: HTMLDivElement;
  private ordersData: OrderEntry[];
  private imagesContainer: HTMLDivElement;
  private imagesData: string[];
  private fileInput: HTMLInputElement;
  private cameraInput: HTMLInputElement;
  private statusSelect: HTMLSelectElement;
  private affectsCheckbox: HTMLInputElement;
  private solutionTextarea: HTMLTextAreaElement;

  constructor(
    app: App,
    existingIssue: Issue | null,
    onSubmit: (issue: Issue) => void
  ) {
    super(app);
    this.issue = existingIssue;
    this.onSubmit = onSubmit;
    this.isEdit = existingIssue !== null;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", {
      text: this.isEdit ? "编辑问题单" : "新建问题单",
    });

    // Form container
    const form = contentEl.createDiv({ cls: "issue-form" });

    // 标题
    this.createField(form, "问题标题 *", (container) => {
      this.titleInput = container.createEl("input", {
        type: "text",
        placeholder: "简短概括问题",
      });
      if (this.issue) this.titleInput.value = this.issue.title;
    });

    // 问题描述
    this.createField(form, "问题描述", (container) => {
      this.descTextarea = container.createEl("textarea", {
        placeholder: "详细描述问题发生的过程、现象和环境",
        attr: { rows: "4" },
      });
      if (this.issue) this.descTextarea.value = this.issue.description;
    });

    // 发现人
    this.createField(form, "发现人 *", (container) => {
      this.discovererInput = container.createEl("input", {
        type: "text",
        placeholder: "姓名",
      });
      if (this.issue) this.discovererInput.value = this.issue.discoverer;
    });

    // 相关人员
    this.createField(form, "相关人员", (container) => {
      this.relatedInput = container.createEl("input", {
        type: "text",
        placeholder: "用逗号分隔多个姓名",
      });
      if (this.issue) this.relatedInput.value = this.issue.relatedPeople;
    });

    // 订单列表（支持多个）
    const ordersField = form.createDiv({ cls: "issue-field" });
    ordersField.createEl("label", { text: "受影响订单", cls: "issue-field-label" });
    this.ordersContainer = ordersField.createDiv({ cls: "issue-orders-container" });

    // 初始化图片数据
    this.imagesData = this.issue?.images
      ? this.issue.images.map((p) => p)
      : [];

    this.ordersData = this.issue
      ? this.issue.orders.map((o) => ({ ...o }))
      : [];

    // 如果编辑时没有订单数据（旧数据结构迁移），默认给一个空行
    if (this.ordersData.length === 0) {
      this.ordersData.push({ orderNo: "", customer: "", model: "", quantity: "" });
    }

    // 渲染已有订单或添加一个空行
    const renderOrders = () => {
      this.ordersContainer.empty();

      this.ordersData.forEach((order, idx) => {
        const entry = this.ordersContainer.createDiv({ cls: "issue-order-entry" });

        // 序号标题
        const header = entry.createDiv({ cls: "issue-order-header" });
        header.createSpan({ text: `订单 ${idx + 1}` });

        // 四个输入框
        const row1 = entry.createDiv({ cls: "issue-order-row" });
        this.createInlineField(row1, "订单号", order.orderNo, (val) => {
          this.ordersData[idx].orderNo = val;
        });
        this.createInlineField(row1, "客户", order.customer, (val) => {
          this.ordersData[idx].customer = val;
        });

        const row2 = entry.createDiv({ cls: "issue-order-row" });
        this.createInlineField(row2, "型号", order.model, (val) => {
          this.ordersData[idx].model = val;
        });
        this.createInlineField(row2, "数量", order.quantity, (val) => {
          this.ordersData[idx].quantity = val;
        });

        // 删除按钮
        if (this.ordersData.length > 1) {
          const delBtn = entry.createEl("button", {
            text: "删除",
            cls: "issue-btn-sm issue-btn-danger",
          });
          delBtn.addEventListener("click", () => {
            this.ordersData.splice(idx, 1);
            renderOrders();
          });
        }
      });

      // 添加订单按钮
      const addBtn = this.ordersContainer.createEl("button", {
        text: "+ 添加订单",
        cls: "issue-btn-sm",
      });
      addBtn.addEventListener("click", () => {
        this.ordersData.push({ orderNo: "", customer: "", model: "", quantity: "" });
        renderOrders();
      });
    };

    renderOrders();

    // 状态
    this.createField(form, "解决进度", (container) => {
      this.statusSelect = container.createEl("select");
      STATUS_OPTIONS.forEach((s) => {
        const opt = this.statusSelect.createEl("option", { text: s });
        opt.value = s;
      });
      if (this.issue) this.statusSelect.value = this.issue.status;
    });

    // 是否影响生产
    this.createField(form, "是否影响生产", (container) => {
      const label = container.createEl("label", { cls: "checkbox-label" });
      this.affectsCheckbox = label.createEl("input", {
        type: "checkbox",
      });
      label.createSpan({ text: " 是，已影响线上环境" });
      if (this.issue) this.affectsCheckbox.checked = this.issue.affectsProduction;
    });

    // 解决方案
    this.createField(form, "解决方案", (container) => {
      this.solutionTextarea = container.createEl("textarea", {
        placeholder: "描述已采取或计划中的解决方案",
        attr: { rows: "3" },
      });
      if (this.issue) this.solutionTextarea.value = this.issue.solution;
    });


    // 图片附件
    this.createField(form, "图片附件", (container) => {
      this.imagesContainer = container.createDiv({ cls: "issue-images-container" });

      // 隐藏的文件选择器（上传本地图片）
      this.fileInput = container.createEl("input", {
        attr: { type: "file", accept: "image/*", multiple: "multiple" },
      });
      this.fileInput.style.display = "none";
      this.fileInput.addEventListener("change", () => this.handleImageSelect());

      // 隐藏的拍照输入（移动端打开相机）
      this.cameraInput = container.createEl("input", {
        attr: { type: "file", accept: "image/*", capture: "environment", multiple: "false" },
      });
      this.cameraInput.style.display = "none";
      this.cameraInput.addEventListener("change", () => this.handleImageSelectFromCamera());

      // 工具栏按钮组
      const toolbar = container.createDiv({ cls: "issue-image-toolbar" });

      const uploadBtn = toolbar.createEl("button", {
        text: "📁 上传图片",
        cls: "issue-btn-sm",
      });
      uploadBtn.addEventListener("click", () => this.fileInput.click());

      const cameraBtn = toolbar.createEl("button", {
        text: "📷 拍照",
        cls: "issue-btn-sm",
      });
      cameraBtn.addEventListener("click", () => this.cameraInput.click());

      const pasteHint = toolbar.createEl("span", {
        text: "📋 或 Ctrl+V 粘贴",
        cls: "issue-paste-hint",
      });

      // 为 modal 添加粘贴监听
      this.modalEl.addEventListener("paste", (e: ClipboardEvent) => {
        this.handlePasteImage(e);
      });

      // 渲染已有图片
      this.renderImagePreviews();
    });
    // Buttons
    const btnContainer = form.createDiv({ cls: "issue-form-buttons" });
    const saveBtn = btnContainer.createEl("button", {
      text: this.isEdit ? "保存修改" : "创建问题单",
      cls: "mod-cta",
    });
    saveBtn.addEventListener("click", () => this.saveIssue());

    const cancelBtn = btnContainer.createEl("button", {
      text: "取消",
    });
    cancelBtn.addEventListener("click", () => this.close());

    // 回车键快捷保存
    this.titleInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveBtn.click();
      }
    });
  }

  private createField(
    container: HTMLElement,
    label: string,
    contentFn: (c: HTMLElement) => void
  ) {
    const field = container.createDiv({ cls: "issue-field" });
    field.createEl("label", { text: label, cls: "issue-field-label" });
    const inputContainer = field.createDiv({ cls: "issue-field-input" });
    contentFn(inputContainer);
  }

  private createInlineField(
    container: HTMLElement,
    label: string,
    value: string,
    onChange: (val: string) => void
  ) {
    const field = container.createDiv({ cls: "issue-inline-field" });
    field.createEl("span", { text: label, cls: "issue-inline-label" });
    const input = field.createEl("input", {
      type: "text",
      placeholder: label,
    });
    input.value = value;
    input.addEventListener("input", () => onChange(input.value));
  }

  /** 从 ordersData 获取订单列表 */
  private collectOrders(): OrderEntry[] {
    return this.ordersData.filter((o) => o.orderNo.trim().length > 0);
  }

  /** 处理图片选择（上传本地图片） */
  private async handleImageSelect() {
    const files = this.fileInput.files;
    if (!files || files.length === 0) return;
    await this.saveImageFiles(Array.from(files));
    this.fileInput.value = "";
  }

  /** 处理拍照 */
  private async handleImageSelectFromCamera() {
    const files = this.cameraInput.files;
    if (!files || files.length === 0) return;
    await this.saveImageFiles(Array.from(files));
    this.cameraInput.value = "";
  }

  /** 处理粘贴图片 */
  private async handlePasteImage(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await this.saveImageFiles([file]);
          new Notice("已粘贴图片");
        }
        break;
      }
    }
  }

  /** 通用：将文件列表保存到 Vault */
  private async saveImageFiles(files: File[]) {
    const vault = this.app.vault;
    const imgFolder = normalizePath("问题单截图");
    const folderExists = vault.getAbstractFileByPath(imgFolder);
    if (!folderExists) {
      await vault.createFolder(imgFolder);
    }

    for (const file of files) {
      const reader = new FileReader();
      const data = await new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      const ext = file.name?.split(".").pop() || "png";
      const fileName = `issue_img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
      const filePath = normalizePath(`${imgFolder}/${fileName}`);

      try {
        await vault.createBinary(filePath, data);
        this.imagesData.push(filePath);
      } catch (e) {
        new Notice(`图片保存失败: ${e.message}`);
      }
    }

    this.renderImagePreviews();
  }

  /** 渲染图片预览 */
  private renderImagePreviews() {
    if (!this.imagesContainer) return;
    this.imagesContainer.empty();

    if (this.imagesData.length === 0) {
      this.imagesContainer.createSpan({
        text: "暂无截图，点击上方按钮添加",
        cls: "issue-images-empty",
      });
      return;
    }

    this.imagesData.forEach((imgPath, idx) => {
      const wrapper = this.imagesContainer.createDiv({ cls: "issue-image-wrapper" });

      const img = wrapper.createEl("img", {
        cls: "issue-image-thumb",
      });

      // 尝试获取可访问的资源路径
      const file = this.app.vault.getAbstractFileByPath(imgPath);
      if (file instanceof TFile) {
        img.src = this.app.vault.getResourcePath(file);
      }

      img.addEventListener("click", () => {
        // 点击放大查看
        const modal = new Modal(this.app);
        modal.onOpen = () => {
          modal.contentEl.empty();
          modal.contentEl.addClass("issue-image-preview-modal");
          const fullImg = modal.contentEl.createEl("img", {
            cls: "issue-image-full",
          });
          if (file instanceof TFile) {
            fullImg.src = this.app.vault.getResourcePath(file);
          }
          fullImg.style.maxWidth = "100%";
          fullImg.style.maxHeight = "90vh";
          const closeBtn = modal.contentEl.createEl("button", {
            text: "关闭", cls: "mod-cta",
          });
          closeBtn.style.marginTop = "10px";
          closeBtn.addEventListener("click", () => modal.close());
        };
        modal.open();
      });

      const delBtn = wrapper.createEl("button", {
        text: "删除",
        cls: "issue-btn-sm issue-btn-danger",
      });
      delBtn.addEventListener("click", () => {
        this.imagesData.splice(idx, 1);
        this.renderImagePreviews();
      });
    });
  }

  private saveIssue() {
    const title = this.titleInput.value.trim();
    const discoverer = this.discovererInput.value.trim();
    if (!title) {
      new Notice("请输入问题标题");
      return;
    }
    if (!discoverer) {
      new Notice("请输入发现人姓名");
      return;
    }

    const now = moment().format("YYYY-MM-DD HH:mm:ss");
    const issue: Issue = {
      id: this.issue?.id ?? this.generateId(),
      title,
      description: this.descTextarea.value.trim(),
      discoverer,
      relatedPeople: this.relatedInput.value.trim(),
      orders: this.ordersData.filter((o) => o.orderNo.trim().length > 0),
      images: this.imagesData,
      status: this.statusSelect.value as Issue["status"],
      affectsProduction: this.affectsCheckbox.checked,
      solution: this.solutionTextarea.value.trim(),
      createdAt: this.issue?.createdAt ?? now,
      updatedAt: now,
    };

    this.onSubmit(issue);
    this.close();
  }

  private generateId(): string {
    return "ISSUE-" + Date.now().toString(36).toUpperCase();
  }
}

// =========================
// View: 问题单列表
// =========================

class IssueTrackerView extends ItemView {
  private plugin: IssueTrackerPlugin;
  private container: HTMLElement;

  constructor(leaf: WorkspaceLeaf, plugin: IssueTrackerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_ISSUE_TRACKER;
  }

  getDisplayText(): string {
    return "问题单追踪器";
  }

  getIcon(): string {
    return "list-checks";
  }

  async onOpen() {
    this.container = this.contentEl;
    this.render();
  }

  async render() {
    const { container } = this;
    container.empty();

    // --- 标题栏 ---
    const header = container.createDiv({ cls: "issue-header" });
    header.createEl("h2", { text: "生产问题单汇总" });

    // 统计信息
    const issues = this.plugin.getIssues();
    const stats = container.createDiv({ cls: "issue-stats" });

    const totalCount = issues.length;
    const pendingCount = issues.filter((i) => i.status === "待处理").length;
    const inProgressCount = issues.filter((i) => i.status === "处理中").length;
    const resolvedCount = issues.filter((i) => i.status === "已解决").length;
    const productionImpactCount = issues.filter(
      (i) => i.affectsProduction
    ).length;

    stats.createSpan({
      text: `共 ${totalCount} 条  |  待处理 ${pendingCount}  |  处理中 ${inProgressCount}  |  已解决 ${resolvedCount}  |  影响生产 ${productionImpactCount}`,
    });

    // 操作按钮
    const toolbar = container.createDiv({ cls: "issue-toolbar" });
    const addBtn = toolbar.createEl("button", {
      text: "＋ 新建问题单",
      cls: "mod-cta",
    });
    addBtn.addEventListener("click", () => this.openNewIssueModal());

    const exportBtn = toolbar.createEl("button", {
      text: "📤 导出 Markdown",
    });
    exportBtn.addEventListener("click", () => this.exportToMarkdown());

    // --- 筛选栏 ---
    const filterBar = container.createDiv({ cls: "issue-filter-bar" });
    const searchInput = filterBar.createEl("input", {
      type: "text",
      placeholder: "搜索标题、描述、发现人...",
      cls: "issue-search-input",
    });

    const statusFilter = filterBar.createEl("select", { cls: "issue-filter-select" });
    const allOpt = statusFilter.createEl("option", { text: "全部状态" });
    allOpt.value = "";
    STATUS_OPTIONS.forEach((s) => {
      const opt = statusFilter.createEl("option", { text: s });
      opt.value = s;
    });

    const prodFilter = filterBar.createEl("select", { cls: "issue-filter-select" });
    const allProd = prodFilter.createEl("option", { text: "全部影响范围" });
    allProd.value = "";
    const yesProd = prodFilter.createEl("option", { text: "影响生产" });
    yesProd.value = "yes";
    const noProd = prodFilter.createEl("option", { text: "未影响生产" });
    noProd.value = "no";

    // --- 表格 ---
    const tableContainer = container.createDiv({ cls: "issue-table-container" });

    const renderTable = () => {
      tableContainer.empty();
      const keyword = searchInput.value.trim().toLowerCase();
      const statusVal = statusFilter.value;
      const prodVal = prodFilter.value;

      let filtered = issues;
      if (keyword) {
        filtered = filtered.filter(
          (i) =>
            i.title.toLowerCase().includes(keyword) ||
            i.description.toLowerCase().includes(keyword) ||
            i.discoverer.toLowerCase().includes(keyword) ||
            i.relatedPeople.toLowerCase().includes(keyword)
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
          text: "暂无匹配的问题单，点击上方按钮新建",
          cls: "issue-empty",
        });
        return;
      }

      const table = tableContainer.createEl("table", { cls: "issue-table" });

      // thead
      const thead = table.createEl("thead");
      const headerRow = thead.createEl("tr");
      const headers = [
        "标题",
        "发现人",
        "受影响订单",
        "进度",
        "影响生产",
        "创建时间",
        "操作",
      ];
      headers.forEach((h) => headerRow.createEl("th", { text: h }));

      // tbody
      const tbody = table.createEl("tbody");
      // 排序：未解决（待处理/处理中）在上，已解决/已关闭在下；各组内按更新时间降序
      filtered
        .sort((a, b) => {
          const statusOrder = (s: string) =>
            s === "已解决" || s === "已关闭" ? 1 : 0;
          const cmp = statusOrder(a.status) - statusOrder(b.status);
          return cmp !== 0
            ? cmp
            : moment(b.updatedAt).valueOf() - moment(a.updatedAt).valueOf();
        })
        .forEach((issue) => {
          const row = tbody.createEl("tr");

          // 标题
          row.createEl("td", { text: issue.title, cls: "issue-cell-title" });

          // 发现人
          row.createEl("td", { text: issue.discoverer });

          // 受影响订单
          row.createEl("td", { cls: "issue-cell-orders" }).innerHTML = formatOrdersHtml(issue.orders);

          // 进度 - 带颜色标签
          const statusCell = row.createEl("td");
          const statusBadge = statusCell.createEl("span", {
            text: issue.status,
            cls: `issue-status-badge issue-status-${issue.status}`,
          });

          // 影响生产
          const prodCell = row.createEl("td");
          const prodBadge = prodCell.createEl("span", {
            text: issue.affectsProduction ? "是" : "否",
            cls: issue.affectsProduction
              ? "issue-prod-yes"
              : "issue-prod-no",
          });

          // 创建时间
          row.createEl("td", { text: issue.createdAt });

          // 操作按钮
          const actionCell = row.createEl("td", { cls: "issue-action-cell" });
          const viewBtn = actionCell.createEl("button", {
            text: "详情",
            cls: "issue-btn-sm",
          });
          viewBtn.addEventListener("click", () =>
            this.openDetailModal(issue)
          );

          const editBtn = actionCell.createEl("button", {
            text: "编辑",
            cls: "issue-btn-sm",
          });
          editBtn.addEventListener("click", () =>
            this.openEditModal(issue)
          );

          const delBtn = actionCell.createEl("button", {
            text: "删除",
            cls: "issue-btn-sm issue-btn-danger",
          });
          delBtn.addEventListener("click", () =>
            this.deleteIssue(issue)
          );
        });
    };

    // 绑定筛选事件
    searchInput.addEventListener("input", renderTable);
    statusFilter.addEventListener("change", renderTable);
    prodFilter.addEventListener("change", renderTable);

    // 初始渲染
    renderTable();
  }

  private openNewIssueModal() {
    new IssueModal(this.app, null, (issue) => {
      this.plugin.addIssue(issue);
      new Notice("问题单已创建");
      this.render();
    }).open();
  }

  private openEditModal(issue: Issue) {
    new IssueModal(this.app, issue, (updated) => {
      this.plugin.updateIssue(updated);
      new Notice("问题单已更新");
      this.render();
    }).open();
  }

  private openDetailModal(issue: Issue) {
    const modal = new Modal(this.app);
    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass("issue-detail-modal");

      contentEl.createEl("h2", { text: issue.title });

      const detail = contentEl.createDiv({ cls: "issue-detail" });

      this.addDetailRow(detail, "问题描述", issue.description || "无");
      this.addDetailRow(detail, "发现人", issue.discoverer);
      this.addDetailRow(detail, "相关人员", issue.relatedPeople || "无");
      this.addDetailRow(detail, "受影响订单", formatOrdersText(issue.orders));
      this.addDetailRow(detail, "解决进度", issue.status);

      // 图片展示
      if (issue.images && issue.images.length > 0) {
        const imgRow = detail.createDiv({ cls: "issue-detail-row" });
        imgRow.createEl("span", { text: "截图附件", cls: "issue-detail-label" });
        const imgContainer = imgRow.createDiv({ cls: "issue-detail-images" });
        issue.images.forEach((imgPath) => {
          const wrapper = imgContainer.createDiv({ cls: "issue-detail-img-wrapper" });
          const img = wrapper.createEl("img", { cls: "issue-detail-img" });
          const file = this.app.vault.getAbstractFileByPath(imgPath);
          if (file instanceof TFile) {
            img.src = this.app.vault.getResourcePath(file);
          }
          img.addEventListener("click", () => {
            const modal = new Modal(this.app);
            modal.onOpen = () => {
              modal.contentEl.empty();
              modal.contentEl.addClass("issue-image-preview-modal");
              const fullImg = modal.contentEl.createEl("img", { cls: "issue-image-full" });
              if (file instanceof TFile) {
                fullImg.src = this.app.vault.getResourcePath(file);
              }
              fullImg.style.maxWidth = "100%";
              fullImg.style.maxHeight = "90vh";
              const closeBtn = modal.contentEl.createEl("button", {
                text: "关闭", cls: "mod-cta",
              });
              closeBtn.style.marginTop = "10px";
              closeBtn.addEventListener("click", () => modal.close());
            };
            modal.open();
          });
        });
      }
      this.addDetailRow(
        detail,
        "是否影响生产",
        issue.affectsProduction ? "是" : "否"
      );
      this.addDetailRow(detail, "解决方案", issue.solution || "暂无");
      this.addDetailRow(detail, "创建时间", issue.createdAt);
      this.addDetailRow(detail, "最后更新", issue.updatedAt);

      const closeBtn = contentEl.createEl("button", {
        text: "关闭",
        cls: "mod-cta",
      });
      closeBtn.addEventListener("click", () => modal.close());
    };
    modal.open();
  }

  private addDetailRow(container: HTMLElement, label: string, value: string) {
    const row = container.createDiv({ cls: "issue-detail-row" });
    row.createEl("span", { text: label, cls: "issue-detail-label" });
    row.createEl("span", { text: value, cls: "issue-detail-value" });
  }

  private deleteIssue(issue: Issue) {
    // 使用 Obsidian 的确认弹窗
    const confirmed = window.confirm(
      `确定要删除问题单「${issue.title}」吗？此操作不可撤销。`
    );
    if (!confirmed) return;

    this.plugin.removeIssue(issue.id);
    new Notice("问题单已删除");
    this.render();
  }

  private async exportToMarkdown() {
    const issues = this.plugin.getIssues();
    if (issues.length === 0) {
      new Notice("没有问题单可导出");
      return;
    }

    let md = "# 生产问题单汇总报告\n\n";
    md += `> 导出时间：${moment().format("YYYY-MM-DD HH:mm:ss")}\n\n`;
    md += `| 标题 | 发现人 | 受影响订单 | 进度 | 影响生产 | 解决方案 | 创建时间 |\n`;
    md += `|------|--------|------------|------|----------|----------|----------|\n`;

    // 排序：未解决在上，已解决/已关闭在下；各组内按更新时间降序
    issues
      .sort((a, b) => {
        const statusOrder = (s: string) =>
          s === "已解决" || s === "已关闭" ? 1 : 0;
        const cmp = statusOrder(a.status) - statusOrder(b.status);
        return cmp !== 0
          ? cmp
          : moment(b.updatedAt).valueOf() - moment(a.updatedAt).valueOf();
      })
      .forEach((i) => {
        md += `| ${i.title} | ${i.discoverer} | ${i.orders.map(o => o.orderNo + "（客户:" + (o.customer || "-") + " 型号:" + (o.model || "-") + " 数量:" + (o.quantity || "-") + "）").join("<br>") || "-"} | ${i.status} | ${i.affectsProduction ? "是" : "否"} | ${i.solution || "-"} | ${i.createdAt} |\n`;
      });

    // 附加详细内容
    md += "\n---\n\n## 问题详情\n\n";
    // 排序：未解决在上，已解决/已关闭在下；各组内按更新时间降序
    issues
      .sort((a, b) => {
        const statusOrder = (s: string) =>
          s === "已解决" || s === "已关闭" ? 1 : 0;
        const cmp = statusOrder(a.status) - statusOrder(b.status);
        return cmp !== 0
          ? cmp
          : moment(b.updatedAt).valueOf() - moment(a.updatedAt).valueOf();
      })
      .forEach((i, idx) => {
        md += `### ${idx + 1}. ${i.title}\n\n`;
        md += `- **问题ID**: ${i.id}\n`;
        md += `- **发现人**: ${i.discoverer}\n`;
        md += `- **相关人员**: ${i.relatedPeople || "无"}\n`;
        md += `- **受影响订单**:\n`;
        if (i.orders.length === 0) {
          md += `  无\n`;
        } else {
          i.orders.forEach((o) => {
            md += `  - ${o.orderNo}（客户: ${o.customer || "-"}, 型号: ${o.model || "-"}, 数量: ${o.quantity || "-"}）\n`;
          });
        }
        md += `- **客户**: ${i.customer || "无"}\n`;
        md += `- **型号**: ${i.model || "无"}\n`;
        md += `- **数量**: ${i.quantity || "无"}\n`;
        md += `- **进度**: ${i.status}\n`;
        md += `- **影响生产**: ${i.affectsProduction ? "是" : "否"}\n`;
        md += `- **问题描述**: ${i.description || "无"}\n`;
        md += `- **解决方案**: ${i.solution || "暂无"}\n`;
        md += `- **创建时间**: ${i.createdAt}\n`;
        md += `- **最后更新**: ${i.updatedAt}\n\n`;
      });

    // 写入 vault
    const fileName = `问题单报告_${moment().format("YYYYMMDD_HHmmss")}.md`;
    try {
      const filePath = normalizePath(fileName);
      await this.app.vault.create(filePath, md);
      new Notice(`已导出到 ${fileName}`);
    } catch (e) {
      new Notice("导出失败: " + e.message);
    }
  }
}

// =========================
// Settings Tab
// =========================

class IssueTrackerSettingTab extends PluginSettingTab {
  private plugin: IssueTrackerPlugin;

  constructor(app: App, plugin: IssueTrackerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "问题单追踪器 - 设置" });

    new Setting(containerEl)
      .setName("数据存储方式")
      .setDesc("选择问题单数据的存储位置")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("plugin-data", "插件数据目录（默认）")
          .addOption("vault-folder", "Vault 文件夹（生成 Markdown 文件）")
          .setValue(this.plugin.settings.storageMode)
          .onChange(async (value: "plugin-data" | "vault-folder") => {
            this.plugin.settings.storageMode = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Vault 文件夹路径")
      .setDesc("当存储方式为「Vault 文件夹」时，指定存放问题单 Markdown 文件的路径")
      .addText((text) =>
        text
          .setPlaceholder("生产问题单")
          .setValue(this.plugin.settings.vaultFolderPath)
          .onChange(async (value) => {
            this.plugin.settings.vaultFolderPath = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

// =========================
// Main Plugin Class
// =========================

export default class IssueTrackerPlugin extends Plugin {
  settings: IssueTrackerSettings;
  private issues: Issue[] = [];

  async onload() {
    await this.loadSettings();
    await this.loadIssues();

    // 注册视图
    this.registerView(
      VIEW_TYPE_ISSUE_TRACKER,
      (leaf) => new IssueTrackerView(leaf, this)
    );

    // 添加 Ribbon 图标（左侧栏）
    this.addRibbonIcon("list-checks", "打开问题单追踪器", () => {
      this.activateView();
    });

    // 添加命令
    this.addCommand({
      id: "open-issue-tracker",
      name: "打开问题单追踪器",
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: "create-new-issue",
      name: "新建问题单",
      callback: () => {
        this.activateView();
        // 延迟一下让视图先加载
        setTimeout(() => {
          const leaves = this.app.workspace.getLeavesOfType(
            VIEW_TYPE_ISSUE_TRACKER
          );
          if (leaves.length > 0) {
            const view = leaves[0].view as IssueTrackerView;
            // 重新触发新建
            new IssueModal(this.app, null, (issue) => {
              this.addIssue(issue);
              new Notice("问题单已创建");
              view.render();
            }).open();
          }
        }, 200);
      },
    });

    // 添加设置选项卡
    this.addSettingTab(new IssueTrackerSettingTab(this.app, this));

    // 如果当前没有打开视图，自动打开
    if (this.app.workspace.getLeavesOfType(VIEW_TYPE_ISSUE_TRACKER).length === 0) {
      this.app.workspace.onLayoutReady(() => {
        this.activateView();
      });
    }
  }

  onunload() {
    // 清理视图
    this.app.workspace
      .getLeavesOfType(VIEW_TYPE_ISSUE_TRACKER)
      .forEach((leaf) => leaf.detach());
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

  getIssues(): Issue[] {
    return this.issues;
  }

  addIssue(issue: Issue) {
    this.issues.push(issue);
    this.saveIssues();
  }

  updateIssue(updated: Issue) {
    const idx = this.issues.findIndex((i) => i.id === updated.id);
    if (idx !== -1) {
      this.issues[idx] = updated;
      this.saveIssues();
    }
  }

  removeIssue(id: string) {
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

  private async loadIssues() {
    const data = await this.loadData();
    this.issues = (data?.issues ?? []) as Issue[];
  }

  private async saveIssues() {
    const data = await this.loadData();
    await this.saveData({
      ...data,
      issues: this.issues,
    });

    // 如果开启了 vault-folder 模式，同步到 Markdown 文件
    if (this.settings.storageMode === "vault-folder") {
      await this.syncToVaultFolder();
    }
  }

  private async syncToVaultFolder() {
    const folderPath = normalizePath(this.settings.vaultFolderPath);
    // 确保文件夹存在
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!folder) {
      await this.app.vault.createFolder(folderPath);
    }

    // 删除旧的同步文件
    const existingFiles = this.app.vault.getFiles().filter(
      (f) => f.path.startsWith(folderPath + "/") && f.name.startsWith("issue-")
    );
    for (const f of existingFiles) {
      await this.app.vault.delete(f);
    }

    // 为每个 issue 创建一个 markdown 文件
    for (const issue of this.issues) {
      const safeName = issue.title
        .replace(/[\\/:*?"<>|]/g, "_")
        .substring(0, 50);
      const fileName = `issue-${issue.id}-${safeName}.md`;
      const filePath = normalizePath(`${folderPath}/${fileName}`);

      let md = `---\n`;
      md += `id: ${issue.id}\n`;
      md += `title: "${issue.title}"\n`;
      md += `discoverer: ${issue.discoverer}\n`;
      md += `relatedPeople: "${issue.relatedPeople}"\n`;
      md += `orders:\n`;
      issue.orders.forEach((o) => {
        md += `  - orderNo: "${o.orderNo}"\n`;
        md += `    customer: "${o.customer}"\n`;
        md += `    model: "${o.model}"\n`;
        md += `    quantity: "${o.quantity}"\n`;
      });
      md += `status: ${issue.status}\n`;
      md += `affectsProduction: ${issue.affectsProduction}\n`;
      md += `createdAt: ${issue.createdAt}\n`;
      md += `updatedAt: ${issue.updatedAt}\n`;
      md += `---\n\n`;
      md += `# ${issue.title}\n\n`;
      md += `## 问题描述\n\n${issue.description || "无"}\n\n`;
      md += `## 解决方案\n\n${issue.solution || "暂无"}\n\n`;
      md += `## 元数据\n\n`;
      md += `- **问题ID**: ${issue.id}\n`;
      md += `- **发现人**: ${issue.discoverer}\n`;
      md += `- **相关人员**: ${issue.relatedPeople || "无"}\n`;
      // 受影响订单 - 多订单换行展示
        const vaultOrderItems = splitOrders(issue.affectedOrder);
        if (vaultOrderItems.length === 0) {
          md += `- **受影响订单**: 无\n`;
        } else {
          md += `- **受影响订单**:\n`;
          vaultOrderItems.forEach((o) => {
            md += `  - ${o}\n`;
          });
        }
      md += `- **客户**: ${issue.customer || "无"}\n`;
      md += `- **型号**: ${issue.model || "无"}\n`;
      md += `- **数量**: ${issue.quantity || "无"}\n`;
      md += `- **进度**: ${issue.status}\n`;
      md += `- **影响生产**: ${issue.affectsProduction ? "是" : "否"}\n`;
      md += `- **创建时间**: ${issue.createdAt}\n`;
      md += `- **最后更新**: ${issue.updatedAt}\n`;
        if (issue.images && issue.images.length > 0) {
          md += `- **截图附件**:\n`;
          issue.images.forEach((imgPath) => {
            md += `  - ![](${imgPath})\n`;
          });
        }

      await this.app.vault.create(filePath, md);
    }
  }
}
