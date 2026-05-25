import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, ExternalLink, Eye, EyeOff, Globe, Key, User, HelpCircle, Edit2, FileText } from 'lucide-react';
import './index.less';

export interface AccountItem {
  id: string;
  url: string;
  account: string;
  password?: string;
  description?: string;
}

interface AccountPanelProps {
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const AccountPanel: React.FC<AccountPanelProps> = ({ showToast }) => {
  const [items, setItems] = useState<AccountItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  // 新增账号表单状态
  const [url, setUrl] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('');

  // 编辑账号状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editAccount, setEditAccount] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  // 加载账号数据
  useEffect(() => {
    if (isExtension) {
      chrome.storage.local.get(['sync_account_items'], (result) => {
        if (result.sync_account_items) {
          setItems(result.sync_account_items);
        }
      });
    } else {
      const saved = localStorage.getItem('sync_account_items');
      if (saved) {
        try {
          setItems(JSON.parse(saved));
        } catch {}
      }
    }
  }, []);

  // 持久化保存
  const saveItems = (updated: AccountItem[]) => {
    setItems(updated);
    if (isExtension) {
      chrome.storage.local.set({ sync_account_items: updated });
    } else {
      localStorage.setItem('sync_account_items', JSON.stringify(updated));
    }
  };

  // 添加账号提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      showToast('URL 不能为空', 'warning');
      return;
    }
    if (!account.trim()) {
      showToast('账号 不能为空', 'warning');
      return;
    }

    const newItem: AccountItem = {
      id: Date.now().toString(),
      url: url.trim(),
      account: account.trim(),
      password: password,
      description: description.trim()
    };

    const updated = [newItem, ...items];
    saveItems(updated);
    
    // 清空表单
    setUrl('');
    setAccount('');
    setPassword('');
    setDescription('');
    setIsAdding(false);
    showToast('成功添加快捷账号项', 'success');
  };

  // 启动编辑
  const handleStartEdit = (item: AccountItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditUrl(item.url);
    setEditAccount(item.account);
    setEditPassword(item.password || '');
    setEditDescription(item.description || '');
  };

  // 保存修改
  const handleSaveEdit = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editUrl.trim()) {
      showToast('URL 不能为空', 'warning');
      return;
    }
    if (!editAccount.trim()) {
      showToast('账号 不能为空', 'warning');
      return;
    }

    const updated = items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          url: editUrl.trim(),
          account: editAccount.trim(),
          password: editPassword,
          description: editDescription.trim()
        };
      }
      return item;
    });

    saveItems(updated);
    setEditingId(null);
    showToast('已保存修改项', 'success');
  };

  // 删除账号
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = items.filter(item => item.id !== id);
    saveItems(updated);
    showToast('账号项已删除', 'info');
  };

  // 打开 URL
  const handleOpenUrl = (targetUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let finalUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'http://' + finalUrl;
    }
    
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: finalUrl });
    } else {
      window.open(finalUrl, '_blank');
    }
    showToast('已在新标签页打开 URL', 'success');
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
    showToast(`${label}已复制`, 'success');
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
    return rawUrl.replace(/^https?:\/\//i, '');
  };

  return (
    <div className="panel-container account-panel-container">
      {/* 快捷工具栏 */}
      <div className="account-toolbar">
        <button 
          className={`btn-add-account ${isAdding ? 'active' : ''}`}
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
              required
            />
          </div>

          <div className="input-field">
            <User size={13} className="input-icon" />
            <input
              type="text"
              placeholder="请输入 登录账号"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              required
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
            <button type="button" className="btn-cancel" onClick={() => setIsAdding(false)}>
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
            <HelpCircle size={26} style={{ color: 'var(--text-muted)' }} />
            <p>账号簿内空空如也</p>
            <p className="sub-desc">点击“快捷添加账号”录入首个快捷访问账号项</p>
          </div>
        ) : (
          <div className="account-cards-list">
            {items.map((item) => {
              const isPasswordVisible = visiblePasswords.has(item.id);
              const isEditing = editingId === item.id;

              return (
                <div 
                  key={item.id} 
                  className={`account-card ${isEditing ? 'editing' : ''}`} 
                  onClick={(e) => handleCardClick(item, e)}
                >
                  {isEditing ? (
                    /* 编辑状态卡片内部渲染 */
                    <form className="edit-card-form" onSubmit={(e) => handleSaveEdit(item.id, e)} onClick={(e) => e.stopPropagation()}>
                      <div className="edit-card-title">编辑账号信息</div>
                      
                      <div className="input-field small">
                        <Globe size={12} className="input-icon" />
                        <input
                          type="text"
                          placeholder="网址 (例如 google.com)"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          required
                        />
                      </div>

                      <div className="input-field small">
                        <User size={12} className="input-icon" />
                        <input
                          type="text"
                          placeholder="账号"
                          value={editAccount}
                          onChange={(e) => setEditAccount(e.target.value)}
                          required
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
                        <button type="button" className="btn-edit-cancel" onClick={() => setEditingId(null)}>
                          取消
                        </button>
                        <button type="submit" className="btn-edit-save">
                          保存
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* 正常展示状态卡片内部渲染 */
                    <>
                      {/* 卡片头部：URL与动作 */}
                      <div className="card-header">
                        <div className="url-container" title="点击跳转打开新窗口">
                          <Globe size={14} className="globe" />
                          <span className="url-text">{getDisplayUrl(item.url)}</span>
                          <ExternalLink size={11} className="link-arrow" />
                        </div>
                        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="btn-card-action edit"
                            onClick={(e) => handleStartEdit(item, e)}
                            title="编辑此项"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            className="btn-card-action delete"
                            onClick={(e) => handleDelete(item.id, e)}
                            title="删除此项"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* 卡片内容域：账号与密码 */}
                      <div className="card-body">
                        {/* 账号 */}
                        <div className="credential-row" onClick={(e) => e.stopPropagation()}>
                          <div className="field-label">
                            <User size={12} />
                            <span>账号</span>
                          </div>
                          <div className="field-value-wrapper">
                            <span className="field-value" title={item.account}>{item.account}</span>
                            <button 
                              className="btn-copy"
                              onClick={(e) => handleCopy(item.account, '账号', e)}
                              title="复制账号"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        </div>

                        {/* 密码 */}
                        {item.password && (
                          <div className="credential-row" onClick={(e) => e.stopPropagation()}>
                            <div className="field-label">
                              <Key size={12} />
                              <span>密码</span>
                            </div>
                            <div className="field-value-wrapper">
                              <span className="field-value password-font">
                                {isPasswordVisible ? item.password : '••••••••'}
                              </span>
                              <div className="field-actions-inline">
                                <button
                                  className="btn-hide-show"
                                  onClick={(e) => togglePasswordVisibility(item.id, e)}
                                  title={isPasswordVisible ? '隐藏密码' : '显示密码'}
                                >
                                  {isPasswordVisible ? <EyeOff size={11} /> : <Eye size={11} />}
                                </button>
                                <button 
                                  className="btn-copy"
                                  onClick={(e) => handleCopy(item.password || '', '密码', e)}
                                  title="复制密码"
                                >
                                  <Copy size={11} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 备注描述 */}
                        {item.description && (
                          <div className="card-description-row" onClick={(e) => e.stopPropagation()}>
                            <FileText size={11} className="desc-icon" />
                            <span className="desc-text" title={item.description}>{item.description}</span>
                          </div>
                        )}
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
