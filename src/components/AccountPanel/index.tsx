import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Key,
  User,
  HelpCircle,
  Edit2,
  FileText,
} from "lucide-react";
import "./index.less";

export interface AccountItem {
  id: string;
  url: string;
  account: string;
  password?: string;
  description?: string;
}

interface AccountPanelProps {
  showToast: (
    msg: string,
    type: "success" | "error" | "warning" | "info",
  ) => void;
}

const AccountPanel: React.FC<AccountPanelProps> = ({ showToast }) => {
  const [items, setItems] = useState<AccountItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // 新增账号表单状态
  const [url, setUrl] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [description, setDescription] = useState("");
  const [tempAddId, setTempAddId] = useState<string | null>(null); // 新增临时添加卡片的 ID，用以实现添加时打字随时自动存入卡片列表

  // 编辑账号状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalItem, setOriginalItem] = useState<AccountItem | null>(null); // 备份原始数据，用于取消时撤销自动保存的临时修改
  const [editUrl, setEditUrl] = useState("");
  const [editAccount, setEditAccount] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(
    new Set(),
  );

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isExtension =
    typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

  // 加载账号数据
  useEffect(() => {
    if (isExtension) {
      chrome.storage.local.get(["sync_account_items"], (result) => {
        if (result.sync_account_items) {
          setItems(result.sync_account_items);
        }
      });
    } else {
      const saved = localStorage.getItem("sync_account_items");
      if (saved) {
        try {
          setItems(JSON.parse(saved));
        } catch {}
      }
    }
  }, []);

  // 监听编辑状态变化，实现打字即时自动保存 (Keystroke Auto-save)
  // 不论用户是直接关闭插件还是切换 Tab，在此期间的所有输入都会在后台瞬间默默持久化保存，零丢包！
  useEffect(() => {
    if (!editingId) return;

    // 只有当编辑的四个字段全为空时才不保存，防止保存纯空白卡片。只要有任意一个字段有值就即时自动保存！
    if (!editUrl.trim() && !editAccount.trim() && !editPassword.trim() && !editDescription.trim()) return;

    const updated = items.map((item) => {
      if (item.id === editingId) {
        return {
          ...item,
          url: editUrl.trim(),
          account: editAccount.trim(),
          password: editPassword,
          description: editDescription.trim(),
        };
      }
      return item;
    });

    // 默默后台保存，不弹 Toast 以免干扰用户连续打字
    saveItems(updated);
  }, [editingId, editUrl, editAccount, editPassword, editDescription]);

  // 监听快捷添加表单的输入，实现打字随时自动存入卡片列表 (Keystroke Add Auto-save)
  // 即使不点击确认添加并直接关闭窗口，用户输入的内容也已被作为一个卡片存下来了，剩余未写的值默为空
  useEffect(() => {
    if (!isAdding) return;
    
    // 如果全部为空
    if (!url.trim() && !account.trim() && !password.trim() && !description.trim()) {
      // 如果列表中已经有了这个 tempAddId 卡片，说明用户又删空了，我们从列表中抹去它
      if (tempAddId) {
        const updated = items.filter(item => item.id !== tempAddId);
        saveItems(updated);
        setTempAddId(null);
      }
      return;
    }

    // 获取或生成临时 ID
    let currentId = tempAddId;
    if (!currentId) {
      currentId = 'add_' + Date.now().toString();
      setTempAddId(currentId);
    }

    const newItem: AccountItem = {
      id: currentId,
      url: url.trim(),
      account: account.trim(),
      password: password,
      description: description.trim()
    };

    // 默默将该项以临时卡片更新到 items 最顶端并持久化
    const exists = items.some(item => item.id === currentId);
    let updated: AccountItem[];
    if (exists) {
      updated = items.map(item => item.id === currentId ? newItem : item);
    } else {
      updated = [newItem, ...items];
    }
    saveItems(updated);
  }, [url, account, password, description, isAdding]);

  // 持久化保存
  const saveItems = (updated: AccountItem[]) => {
    setItems(updated);
    if (isExtension) {
      chrome.storage.local.set({ sync_account_items: updated });
    } else {
      localStorage.setItem("sync_account_items", JSON.stringify(updated));
    }
  };

  // 添加账号提交（此时卡片在打字时已实时生成并保存，这里主要是完成临时 ID 的升级与退出添加状态）
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim() && !account.trim() && !password.trim() && !description.trim()) {
      showToast("请至少填写一项账号信息", "warning");
      return;
    }

    // 将临时卡片 ID 转换为正式普通 ID
    if (tempAddId) {
      const updated = items.map(item => {
        if (item.id === tempAddId) {
          return {
            ...item,
            id: Date.now().toString()
          };
        }
        return item;
      });
      saveItems(updated);
    }

    // 清空表单
    setUrl("");
    setAccount("");
    setPassword("");
    setDescription("");
    setTempAddId(null);
    setIsAdding(false);
    showToast("成功添加快捷账号项", "success");
  };

  // 取消快捷添加并抹去自动保存的临时卡片
  const handleCancelAdd = () => {
    if (tempAddId) {
      const updated = items.filter(item => item.id !== tempAddId);
      saveItems(updated);
    }
    setUrl("");
    setAccount("");
    setPassword("");
    setDescription("");
    setTempAddId(null);
    setIsAdding(false);
  };

  // 启动编辑并创建原始数据备份
  const handleStartEdit = (item: AccountItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setOriginalItem(item); // 备份原始状态，用于实现完美撤销
    setEditUrl(item.url);
    setEditAccount(item.account);
    setEditPassword(item.password || "");
    setEditDescription(item.description || "");
  };

  // 完成编辑（打字过程中已自动保存，此处主要是退出编辑状态）
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editUrl.trim() && !editAccount.trim() && !editPassword.trim() && !editDescription.trim()) {
      showToast("请至少填写一项账号信息", "warning");
      return;
    }

    setEditingId(null);
    setOriginalItem(null);
    showToast("已保存账号修改", "success");
  };

  // 取消编辑并撤销自动保存的修改
  const handleCancelEdit = () => {
    if (originalItem) {
      const updated = items.map((item) => {
        if (item.id === originalItem.id) {
          return originalItem;
        }
        return item;
      });
      saveItems(updated);
    }
    setEditingId(null);
    setOriginalItem(null);
    showToast("已取消修改", "info");
  };

  /**
   * 点击删除按钮，开启二次确认状态
   * @param id 被删除账号项 ID
   * @param e 鼠标点击事件
   */
  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  /**
   * 确认并真正执行删除账号
   * @param id 被删除账号项 ID
   * @param e 鼠标点击事件
   */
  const handleConfirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = items.filter((item) => item.id !== id);
    saveItems(updated);
    setDeletingId(null);
    showToast("账号项已删除", "info");
  };

  /**
   * 取消删除确认操作
   * @param e 鼠标点击事件
   */
  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  /**
   * 复制并新建一个一模一样的账号项 (克隆功能)
   * @param item 被复制的账号项
   * @param e 鼠标点击事件
   */
  const handleClone = (item: AccountItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const clonedItem: AccountItem = {
      ...item,
      id: Date.now().toString(), // 保证生成唯一的正式 ID
    };

    // 找到原 item 的位置，在它后面插入克隆出来的 item，保证完美的交互顺序
    const index = items.findIndex((i) => i.id === item.id);
    const updated = [...items];
    if (index !== -1) {
      updated.splice(index + 1, 0, clonedItem);
    } else {
      updated.unshift(clonedItem);
    }

    saveItems(updated);
    showToast("已成功复制并新建该账号项", "success");
  };

  // 打开 URL
  const handleOpenUrl = (targetUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let finalUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = "http://" + finalUrl;
    }

    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.create({ url: finalUrl });
    } else {
      window.open(finalUrl, "_blank");
    }
    showToast("已在新标签页打开 URL", "success");
  };

  // 卡片点击控制
  const handleCardClick = (item: AccountItem, e: React.MouseEvent) => {
    if (editingId === item.id) return; // 正在编辑时不触发跳转
    handleOpenUrl(item.url, e);
  };

  // 一键复制
  const handleCopy = (text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    showToast(`${label}已复制`, "success");
  };

  // 密码显示/隐藏切换
  const togglePasswordVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVisibles = new Set(visiblePasswords);
    if (newVisibles.has(id)) {
      newVisibles.delete(id);
    } else {
      newVisibles.add(id);
    }
    setVisiblePasswords(newVisibles);
  };

  // 清理 URL 展示协议前缀
  const getDisplayUrl = (rawUrl: string) => {
    return rawUrl.replace(/^https?:\/\//i, "");
  };

  return (
    <div className="panel-container account-panel-container">
      {/* 快捷工具栏 */}
      <div className="account-toolbar">
        <button
          className={`btn-add-account ${isAdding ? "active" : ""}`}
          onClick={() => setIsAdding(!isAdding)}
        >
          <Plus size={13} />
          快捷添加账号
        </button>
        {items.length > 0 && (
          <span className="account-count">
            共 <span>{items.length}</span> 个账号
          </span>
        )}
      </div>

      {/* 新增账号卡片式表单 */}
      {isAdding && (
        <form className="add-account-form" onSubmit={handleSubmit}>
          <div className="form-header">添加快捷登录账号</div>

          <div className="input-field">
            <Globe size={13} className="input-icon" />
            <input
              type="text"
              placeholder="请输入 URL (例如 google.com 或 localhost:3000)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="input-field">
            <User size={13} className="input-icon" />
            <input
              type="text"
              placeholder="请输入 登录账号"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </div>

          <div className="input-field">
            <Key size={13} className="input-icon" />
            <input
              type="password"
              placeholder="请输入 登录密码 (可选)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="input-field">
            <FileText size={13} className="input-icon" />
            <input
              type="text"
              placeholder="请输入 备注/描述 (可选，例如：测试服环境)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-buttons">
            <button
              type="button"
              className="btn-cancel"
              onClick={handleCancelAdd}
            >
              取消
            </button>
            <button type="submit" className="btn-confirm">
              确认添加
            </button>
          </div>
        </form>
      )}

      {/* 账号展示卡片列表 */}
      <div className="list-scroll-area">
        {items.length === 0 ? (
          <div className="empty-state">
            <HelpCircle size={26} style={{ color: "var(--text-muted)" }} />
            <p>账号簿内空空如也</p>
            <p className="sub-desc">点击“快捷添加账号”录入首个快捷访问账号项</p>
          </div>
        ) : (
          <div className="account-cards-list">
            {items.map((item) => {
              const isPasswordVisible = visiblePasswords.has(item.id);
              const isEditing = editingId === item.id;
              const isDeleting = deletingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`account-card ${isEditing ? "editing" : ""} ${isDeleting ? "deleting" : ""}`}
                  onClick={(e) => handleCardClick(item, e)}
                >
                  {isDeleting && (
                    <div className="card-delete-overlay" onClick={(e) => e.stopPropagation()}>
                      <span className="confirm-msg">确认删除此账号项？</span>
                      <div className="confirm-actions">
                        <button
                          type="button"
                          className="btn-action-cancel"
                          onClick={handleCancelDelete}
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          className="btn-action-delete"
                          onClick={(e) => handleConfirmDelete(item.id, e)}
                        >
                          确认删除
                        </button>
                      </div>
                    </div>
                  )}
                  {isEditing ? (
                    /* 编辑状态卡片内部渲染 */
                    <form
                      className="edit-card-form"
                      onSubmit={handleSaveEdit}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="edit-card-title">编辑账号信息</div>

                      <div className="input-field small">
                        <Globe size={12} className="input-icon" />
                        <input
                          type="text"
                          placeholder="网址 (例如 google.com)"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                        />
                      </div>

                      <div className="input-field small">
                        <User size={12} className="input-icon" />
                        <input
                          type="text"
                          placeholder="账号"
                          value={editAccount}
                          onChange={(e) => setEditAccount(e.target.value)}
                        />
                      </div>

                      <div className="input-field small">
                        <Key size={12} className="input-icon" />
                        <input
                          type="password"
                          placeholder="密码 (可选)"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                        />
                      </div>

                      <div className="input-field small">
                        <FileText size={12} className="input-icon" />
                        <input
                          type="text"
                          placeholder="描述/备注 (可选)"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                        />
                      </div>

                      <div className="edit-form-buttons">
                        <button
                          type="button"
                          className="btn-edit-cancel"
                          onClick={handleCancelEdit}
                        >
                          取消
                        </button>
                        <button type="submit" className="btn-edit-save">
                          完成
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* 正常展示状态卡片内部渲染 */
                    <>
                      {/* 卡片头部：URL与动作 */}
                      <div className="card-header">
                        <div
                          className="url-container"
                          title="点击跳转打开新窗口"
                        >
                          <Globe size={14} className="globe" />
                          <span className="url-text">
                            {getDisplayUrl(item.url)}
                          </span>
                          <ExternalLink size={11} className="link-arrow" />
                        </div>
                        <div
                          className="card-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="btn-card-action clone"
                            onClick={(e) => handleClone(item, e)}
                            title="复制并新建此项"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            className="btn-card-action edit"
                            onClick={(e) => handleStartEdit(item, e)}
                            title="编辑此项"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="btn-card-action delete"
                            onClick={(e) => handleDeleteClick(item.id, e)}
                            title="删除此项"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* 卡片内容域：账号与密码 */}
                      <div className="card-body">
                        {/* 账号 */}
                        <div
                          className="credential-row"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="field-label">
                            <User size={12} />
                            <span>账号</span>
                          </div>
                          <div className="field-value-wrapper">
                            <span className="field-value" title={item.account}>
                              {item.account}
                            </span>
                            <button
                              className="btn-copy"
                              onClick={(e) =>
                                handleCopy(item.account, "账号", e)
                              }
                              title="复制账号"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        </div>

                        {/* 密码 */}
                        <div
                          className="credential-row"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="field-label">
                            <Key size={12} />
                            <span>密码</span>
                          </div>
                          <div className="field-value-wrapper">
                            <span className="field-value password-font">
                              {item.password ? (isPasswordVisible ? item.password : "••••••••") : ""}
                            </span>
                            <div className="field-actions-inline">
                              <button
                                className="btn-hide-show"
                                onClick={(e) =>
                                  togglePasswordVisibility(item.id, e)
                                }
                                title={
                                  isPasswordVisible ? "隐藏密码" : "显示密码"
                                }
                                disabled={!item.password}
                              >
                                {isPasswordVisible ? (
                                  <EyeOff size={11} />
                                ) : (
                                  <Eye size={11} />
                                )}
                              </button>
                              <button
                                className="btn-copy"
                                onClick={(e) =>
                                  handleCopy(item.password || "", "密码", e)
                                }
                                title="复制密码"
                                disabled={!item.password}
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 备注描述 */}
                        <div
                          className="card-description-row"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileText size={11} className="desc-icon" />
                          <span
                            className="desc-text"
                            title={item.description}
                          >
                            {item.description || ""}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountPanel;
