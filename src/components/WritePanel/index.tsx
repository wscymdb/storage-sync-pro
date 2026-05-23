import React, { useState, useEffect } from 'react';
import { Play, Plus, Edit2, Trash2, Check, X, AlertTriangle, Globe, HelpCircle } from 'lucide-react';
import './index.less';

interface WritePanelProps {
  boxItems: Record<string, string>;
  onRemoveFromBox: (key: string) => void;
  onUpdateBoxItem: (oldKey: string, newKey: string, newValue: string) => void;
  onClearBox: () => void;
  onAddBoxItem: (key: string, value: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const WritePanel: React.FC<WritePanelProps> = ({
  boxItems,
  onRemoveFromBox,
  onUpdateBoxItem,
  onClearBox,
  onAddBoxItem,
  showToast
}) => {
  const [targetDomain, setTargetDomain] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // 编辑态状态控制
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editKeyInput, setEditKeyInput] = useState('');
  const [editValueInput, setEditValueInput] = useState('');

  const isExtension = typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting;

  // 获取目标页面域名
  const fetchTargetDomain = async () => {
    if (!isExtension) {
      setTargetDomain('localhost:3000 (预览目标页)');
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        try {
          const urlObj = new URL(tab.url);
          setTargetDomain(urlObj.host);
        } catch {
          setTargetDomain(tab.title || '未知页面');
        }
      } else {
        setTargetDomain('无活跃标签页');
      }
    } catch {
      setTargetDomain('未知页面');
    }
  };

  useEffect(() => {
    fetchTargetDomain();
  }, []);

  // 默认全选缓存箱中的所有 Key
  useEffect(() => {
    setSelectedKeys(new Set(Object.keys(boxItems)));
  }, [boxItems]);

  const keys = Object.keys(boxItems);

  // 单选/多选
  const handleSelectKey = (key: string) => {
    const newSelected = new Set(selectedKeys);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedKeys(newSelected);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedKeys.size === keys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(keys));
    }
  };

  // 保存新增
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) {
      showToast('Key 不能为空', 'warning');
      return;
    }
    if (boxItems[newKey.trim()]) {
      showToast('已存在同名的 Key', 'warning');
      return;
    }

    onAddBoxItem(newKey.trim(), newValue);
    setNewKey('');
    setNewValue('');
    setIsAdding(false);
    showToast('已添加新字段到缓存箱', 'success');
  };

  // 进入编辑状态
  const startEdit = (key: string, value: string) => {
    setEditingKey(key);
    setEditKeyInput(key);
    setEditValueInput(value);
  };

  // 提交修改
  const saveEdit = (oldKey: string) => {
    const targetKey = editKeyInput.trim();
    if (!targetKey) {
      showToast('Key 不能为空', 'warning');
      return;
    }

    // 若修改了 Key 且新 Key 在其他项已存在
    if (targetKey !== oldKey && boxItems[targetKey]) {
      showToast('已存在同名 Key，修改失败', 'warning');
      return;
    }

    onUpdateBoxItem(oldKey, targetKey, editValueInput);
    setEditingKey(null);
    showToast('字段修改成功', 'success');
  };

  // 写入当前页面
  const handleWriteToPage = async () => {
    if (selectedKeys.size === 0) {
      showToast('请至少选择一个要写入的字段', 'warning');
      return;
    }

    const dataToWrite: Record<string, string> = {};
    selectedKeys.forEach(key => {
      if (boxItems[key] !== undefined) {
        dataToWrite[key] = boxItems[key];
      }
    });

    if (!isExtension) {
      showToast('写入成功 (预览模式写入模拟页面)', 'success');
      console.log('写入数据:', dataToWrite);
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        showToast('未检测到活动标签页，写入失败', 'error');
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (items) => {
          Object.entries(items).forEach(([k, v]) => {
            localStorage.setItem(k, v);
          });
        },
        args: [dataToWrite]
      });

      showToast(`成功向当前页面写入 ${Object.keys(dataToWrite).length} 个字段`, 'success');
    } catch (err) {
      console.error(err);
      showToast('写入失败，可能此域名权限被限制', 'error');
    }
  };

  return (
    <div className="panel-container">
      {/* 写入提示目标栏 */}
      <div className="target-info-bar">
        <div className="target-text">
          <Globe size={14} className="globe-icon" />
          <span className="label">写入目标页:</span>
          <span className="domain" title={targetDomain}>{targetDomain}</span>
        </div>
        <button className="btn-clean" onClick={fetchTargetDomain} title="刷新当前页域名">
          刷新
        </button>
      </div>

      {/* 操作与新增工具栏 */}
      <div className="box-toolbar">
        <button className={`btn-secondary ${isAdding ? 'active' : ''}`} onClick={() => setIsAdding(!isAdding)}>
          <Plus size={13} />
          手动添加
        </button>
        {keys.length > 0 && (
          <div className="box-multi-actions">
            <button className="btn-link" onClick={handleSelectAll}>
              {selectedKeys.size === keys.length ? '取消全选' : '全选'}
            </button>
            <span className="divider">|</span>
            <button className="btn-link danger" onClick={onClearBox}>
              清空缓存
            </button>
          </div>
        )}
      </div>

      {/* 新增输入表单，带过渡状态 */}
      {isAdding && (
        <form className="add-form" onSubmit={handleAddSubmit}>
          <div className="form-title">添加新字段到缓存箱</div>
          <div className="input-group">
            <input
              type="text"
              placeholder="请输入 Key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="input-text"
              required
            />
          </div>
          <div className="input-group">
            <textarea
              placeholder="请输入 Value (支持复杂 JSON)"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="input-textarea"
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => setIsAdding(false)}>
              取消
            </button>
            <button type="submit" className="btn-submit">
              确定
            </button>
          </div>
        </form>
      )}

      {/* 缓存数据列表 */}
      <div className="list-scroll-area">
        {keys.length === 0 ? (
          <div className="empty-state">
            <HelpCircle size={26} style={{ color: 'var(--text-muted)' }} />
            <p>缓存箱内还没有任何数据</p>
            <p className="sub-desc">请从【读取数据】勾选导入，或者【手动添加】</p>
          </div>
        ) : (
          <div className="box-list">
            {keys.map((key) => {
              const val = boxItems[key];
              const isSelected = selectedKeys.has(key);
              const isEditing = editingKey === key;

              if (isEditing) {
                return (
                  <div key={key} className="box-item editing">
                    <div className="edit-form-inline">
                      <div className="edit-row">
                        <span className="edit-label">Key:</span>
                        <input
                          type="text"
                          value={editKeyInput}
                          onChange={(e) => setEditKeyInput(e.target.value)}
                          className="input-edit-key"
                        />
                      </div>
                      <div className="edit-row column">
                        <span className="edit-label">Value:</span>
                        <textarea
                          value={editValueInput}
                          onChange={(e) => setEditValueInput(e.target.value)}
                          className="input-edit-val"
                          rows={3}
                        />
                      </div>
                      <div className="edit-actions">
                        <button className="btn-edit-cancel" onClick={() => setEditingKey(null)} title="取消">
                          <X size={12} />
                        </button>
                        <button className="btn-edit-save" onClick={() => saveEdit(key)} title="保存修改">
                          <Check size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={key} className={`box-item ${isSelected ? 'selected' : ''}`}>
                  <div className="item-header">
                    <label className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectKey(key)}
                      />
                      <span className="custom-checkbox">
                        {isSelected && <Check size={10} strokeWidth={4} />}
                      </span>
                    </label>
                    <span className="key-text" onClick={() => handleSelectKey(key)} title={key}>
                      {key}
                    </span>
                    <div className="actions">
                      <button className="btn-item-action edit" onClick={() => startEdit(key, val)} title="编辑">
                        <Edit2 size={12} />
                      </button>
                      <button className="btn-item-action delete" onClick={() => onRemoveFromBox(key)} title="从缓存移除">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="item-value-preview" onClick={() => handleSelectKey(key)}>
                    {val || <span className="empty-value">空字符串</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部悬浮写入区 */}
      <div className="action-bar-write">
        <div className="write-summary">
          <AlertTriangle size={12} className="warning-icon" />
          <span>将写入 {selectedKeys.size} 项数据</span>
        </div>
        <button
          className={`btn-write glow-success ${selectedKeys.size === 0 ? 'disabled' : ''}`}
          disabled={selectedKeys.size === 0}
          onClick={handleWriteToPage}
        >
          <Play size={14} fill="white" />
          写入当前页
        </button>
      </div>
    </div>
  );
};

export default WritePanel;
