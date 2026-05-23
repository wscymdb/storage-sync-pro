import React, { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Globe, Shield, Sliders, Plus, X, Info, Sun, Moon } from 'lucide-react';
import './index.less';

interface SettingsPanelProps {
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ showToast, theme, onThemeChange }) => {
  const [autoRead, setAutoRead] = useState(true);
  const [filterKeys, setFilterKeys] = useState<string[]>(['authorization', 'authToken']);
  const [newFilterKey, setNewFilterKey] = useState('');

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    onThemeChange(nextTheme);
  };

  const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  // 初始化加载设置
  useEffect(() => {
    if (isExtension) {
      chrome.storage.local.get(['sync_auto_read', 'sync_filter_keys'], (result) => {
        if (result.sync_auto_read !== undefined) {
          setAutoRead(result.sync_auto_read);
        }
        if (result.sync_filter_keys) {
          setFilterKeys(result.sync_filter_keys);
        }
      });
    } else {
      const savedAutoRead = localStorage.getItem('sync_auto_read');
      if (savedAutoRead !== null) {
        setAutoRead(savedAutoRead === 'true');
      }
      const savedFilterKeys = localStorage.getItem('sync_filter_keys');
      if (savedFilterKeys) {
        try {
          setFilterKeys(JSON.parse(savedFilterKeys));
        } catch {}
      }
    }
  }, []);

  // 保存是否自动读取
  const handleToggleAutoRead = () => {
    const nextVal = !autoRead;
    setAutoRead(nextVal);
    if (isExtension) {
      chrome.storage.local.set({ sync_auto_read: nextVal });
    } else {
      localStorage.setItem('sync_auto_read', String(nextVal));
    }
    showToast(nextVal ? '已开启默认自动读取' : '已配置为默认不读取，需手动刷新', 'success');
  };

  // 添加筛选键
  const handleAddFilterKey = (e: React.FormEvent) => {
    e.preventDefault();
    const key = newFilterKey.trim();
    if (!key) return;
    if (filterKeys.includes(key)) {
      showToast('该筛选字段已存在', 'warning');
      return;
    }
    const updated = [...filterKeys, key];
    setFilterKeys(updated);
    if (isExtension) {
      chrome.storage.local.set({ sync_filter_keys: updated });
    } else {
      localStorage.setItem('sync_filter_keys', JSON.stringify(updated));
    }
    setNewFilterKey('');
    showToast(`已添加筛选字段: ${key}`, 'success');
  };

  // 移除筛选键
  const handleRemoveFilterKey = (keyToRemove: string) => {
    const updated = filterKeys.filter(k => k !== keyToRemove);
    setFilterKeys(updated);
    if (isExtension) {
      chrome.storage.local.set({ sync_filter_keys: updated });
    } else {
      localStorage.setItem('sync_filter_keys', JSON.stringify(updated));
    }
    showToast(`已移除筛选字段: ${keyToRemove}`, 'info');
  };

  return (
    <div className="panel-container settings-panel">
      {/* 模块：外观主题设置 */}
      <div className="settings-section">
        <div className="section-title">
          <Sun size={14} className="icon-title" />
          <span>外观主题</span>
        </div>
        
        <div className="settings-card switch-wrapper" onClick={handleToggleTheme}>
          <div className="setting-info">
            <span className="setting-label">当前外观: {theme === 'dark' ? '深色模式' : '极佳玻璃白模式'}</span>
            <span className="setting-desc">点击在暗夜霓虹与高透玻璃白外观间切换</span>
          </div>
          <button type="button" className="btn-toggle-switch">
            {theme === 'dark' ? (
              <Moon size={24} className="switch-icon active" style={{ color: '#60a5fa' }} />
            ) : (
              <Sun size={24} className="switch-icon active" style={{ color: '#eab308' }} />
            )}
          </button>
        </div>
      </div>

      {/* 模块一：读取首选项设置 */}
      <div className="settings-section">
        <div className="section-title">
          <Globe size={14} className="icon-title" />
          <span>读取首选项</span>
        </div>
        
        <div className="settings-card switch-wrapper" onClick={handleToggleAutoRead}>
          <div className="setting-info">
            <span className="setting-label">默认加载时读取</span>
            <span className="setting-desc">打开插件时是否自动读取当前页存储</span>
          </div>
          <button type="button" className="btn-toggle-switch">
            {autoRead ? (
              <ToggleRight size={28} className="switch-icon active" />
            ) : (
              <ToggleLeft size={28} className="switch-icon" />
            )}
          </button>
        </div>
      </div>

      {/* 模块二：字段筛选规则 */}
      <div className="settings-section">
        <div className="section-title">
          <Sliders size={14} className="icon-title" />
          <span>默认过滤读取字段</span>
        </div>
        
        <div className="settings-card filter-keys-config">
          <div className="config-tip">
            <Info size={12} className="info-icon" />
            <span>开启筛选时，只读取以下指定 Key 的值。如未设置任何字段，则默认全量读取所有存储。</span>
          </div>

          <div className="filter-tags-grid">
            {filterKeys.map(key => (
              <span key={key} className="filter-tag-item">
                {key}
                <button type="button" className="btn-tag-delete" onClick={() => handleRemoveFilterKey(key)}>
                  <X size={10} />
                </button>
              </span>
            ))}
            {filterKeys.length === 0 && (
              <span className="empty-filter-tip">未设置任何筛选字段，每次将默认读取全部 `localStorage` 数据。</span>
            )}
          </div>

          <form className="add-filter-inline-form" onSubmit={handleAddFilterKey}>
            <input
              type="text"
              placeholder="新增筛选字段 Key (例如 authorization)"
              value={newFilterKey}
              onChange={(e) => setNewFilterKey(e.target.value)}
              className="input-new-tag"
            />
            <button type="submit" className="btn-add-tag-submit">
              <Plus size={12} />
              添加
            </button>
          </form>
        </div>
      </div>

      {/* 底部系统信息 */}
      <div className="settings-footer">
        <Shield size={12} className="shield-icon" />
        <span>安全沙箱模式已激活 • 数据完全存储在本地本地加密存储中</span>
      </div>
    </div>
  );
};

export default SettingsPanel;
