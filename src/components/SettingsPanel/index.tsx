import React, { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Globe, Shield, Sliders, Plus, X, Info, Sun, Moon, Link } from 'lucide-react';
import { exportBackupData, mergeAndImportBackup } from '../../utils/backup';
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
  const [autoWriteFiltered, setAutoWriteFiltered] = useState(false);
  const [autoWriteToPage, setAutoWriteToPage] = useState(false);
  const [autoWriteUrl, setAutoWriteUrl] = useState('');
  const [autoReadUrl, setAutoReadUrl] = useState('');

  // 备份与智能导入恢复状态
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);
  const [backupStats, setBackupStats] = useState({ accounts: 0, filters: 0, boxItems: 0 });
  const [importAccounts, setImportAccounts] = useState(true);
  const [importFilters, setImportFilters] = useState(true);
  const [importSettings, setImportSettings] = useState(true);
  const [importBoxItems, setImportBoxItems] = useState(true);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    onThemeChange(nextTheme);
  };

  const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  // 初始化加载设置
  useEffect(() => {
    if (isExtension) {
      chrome.storage.local.get(['sync_auto_read', 'sync_filter_keys', 'sync_auto_write_filtered', 'sync_auto_write_to_page', 'sync_auto_write_url', 'sync_auto_read_url'], (result) => {
        if (result.sync_auto_read !== undefined) {
          setAutoRead(result.sync_auto_read);
        }
        if (result.sync_filter_keys) {
          setFilterKeys(result.sync_filter_keys);
        }
        if (result.sync_auto_write_filtered !== undefined) {
          setAutoWriteFiltered(result.sync_auto_write_filtered);
        }
        if (result.sync_auto_write_to_page !== undefined) {
          setAutoWriteToPage(result.sync_auto_write_to_page);
        }
        if (result.sync_auto_write_url !== undefined) {
          setAutoWriteUrl(result.sync_auto_write_url);
        }
        if (result.sync_auto_read_url !== undefined) {
          setAutoReadUrl(result.sync_auto_read_url);
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
      const savedAutoWriteFiltered = localStorage.getItem('sync_auto_write_filtered');
      if (savedAutoWriteFiltered !== null) {
        setAutoWriteFiltered(savedAutoWriteFiltered === 'true');
      }
      const savedAutoWrite = localStorage.getItem('sync_auto_write_to_page');
      if (savedAutoWrite !== null) {
        setAutoWriteToPage(savedAutoWrite === 'true');
      }
      const savedAutoWriteUrl = localStorage.getItem('sync_auto_write_url');
      if (savedAutoWriteUrl !== null) {
        setAutoWriteUrl(savedAutoWriteUrl);
      }
      const savedAutoReadUrl = localStorage.getItem('sync_auto_read_url');
      if (savedAutoReadUrl !== null) {
        setAutoReadUrl(savedAutoReadUrl);
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

  // 保存是否开启筛选数据默认写入
  const handleToggleAutoWriteFiltered = () => {
    if (!autoRead) {
      showToast('需先开启“默认自动读取”，才能启用自动写入', 'warning');
      return;
    }
    const nextVal = !autoWriteFiltered;
    setAutoWriteFiltered(nextVal);
    if (isExtension) {
      chrome.storage.local.set({ sync_auto_write_filtered: nextVal });
    } else {
      localStorage.setItem('sync_auto_write_filtered', String(nextVal));
    }
    showToast(nextVal ? '已开启筛选字段默认写入缓存箱' : '已关闭默认写入缓存箱', 'success');
  };

  // 保存是否开启加载时自动写入
  const handleToggleAutoWriteToPage = () => {
    const nextVal = !autoWriteToPage;
    setAutoWriteToPage(nextVal);
    if (isExtension) {
      chrome.storage.local.set({ sync_auto_write_to_page: nextVal });
    } else {
      localStorage.setItem('sync_auto_write_to_page', String(nextVal));
    }
    if (nextVal) {
      showToast('已开启自动写入，请确保填写匹配网址！', 'success');
    } else {
      showToast('已关闭页面自动写入', 'info');
    }
  };

  // 保存匹配网址
  const handleAutoWriteUrlChange = (val: string) => {
    setAutoWriteUrl(val);
    if (isExtension) {
      chrome.storage.local.set({ sync_auto_write_url: val });
    } else {
      localStorage.setItem('sync_auto_write_url', val);
    }
  };

  // 保存读取匹配网址
  const handleAutoReadUrlChange = (val: string) => {
    setAutoReadUrl(val);
    if (isExtension) {
      chrome.storage.local.set({ sync_auto_read_url: val });
    } else {
      localStorage.setItem('sync_auto_read_url', val);
    }
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

  // ==================== 备份与导入同步 UI 动作回调 ====================

  // 触发导出
  const handleExportBackupClick = async () => {
    const success = await exportBackupData(!!isExtension);
    if (success) {
      showToast('备份导出成功！已自动触发 JSON 备份包下载', 'success');
    } else {
      showToast('备份导出失败，请重试', 'error');
    }
  };

  // 触发文件选择框
  const triggerFileInput = () => {
    const input = document.getElementById('backup-file-input');
    if (input) input.click();
  };

  // 解析备份文件并呼唤智能合并 modal 弹窗
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || parsed.version === undefined || !parsed.data) {
          showToast('非法的备份 JSON 配置文件', 'error');
          return;
        }

        setPendingBackupData(parsed.data);
        
        // 智能分析包内资源
        const accountsCount = parsed.data.sync_account_items?.length || 0;
        const filterKeysCount = parsed.data.sync_filter_keys?.length || 0;
        const rulesCount = parsed.data.sync_read_filter_rules?.length || 0;
        const totalFilters = filterKeysCount + rulesCount;
        const boxItemsCount = parsed.data.sync_box_items ? Object.keys(parsed.data.sync_box_items).length : 0;
        
        setBackupStats({
          accounts: accountsCount,
          filters: totalFilters,
          boxItems: boxItemsCount
        });

        // 默认按检测状态进行智能勾选
        setImportAccounts(accountsCount > 0);
        setImportFilters(totalFilters > 0);
        setImportBoxItems(boxItemsCount > 0);
        setImportSettings(true);

        setShowImportModal(true);
      } catch (err) {
        showToast('备份包解析失败，请检查文件格式是否损坏', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // 重置 input 允许重复上传相同文件
  };

  // 确认导入并重载
  const handleConfirmImportClick = async () => {
    const success = await mergeAndImportBackup(
      pendingBackupData,
      { importAccounts, importFilters, importSettings, importBoxItems },
      !!isExtension
    );

    if (success) {
      setShowImportModal(false);
      showToast('智能备份同步合并成功！系统正在刷新生效...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } else {
      showToast('备份合并导入失败，请检查数据完整性', 'error');
    }
  };

  return (
    <div className="settings-panel">
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
        
        {/* 卡片一：是否自动读取 */}
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

        {/* 读取匹配网址输入框 */}
        {autoRead && (
          <div className="settings-card url-config-card" style={{ marginTop: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <Link size={12} style={{ color: 'var(--color-primary)' }} />
              <span>自动读取网页限制 <span style={{ color: 'var(--text-muted)' }}>(可选)</span></span>
            </div>
            <input
              type="text"
              className="input-new-tag"
              style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="留空对所有网址生效。例如填写: localhost"
              value={autoReadUrl}
              onChange={(e) => handleAutoReadUrlChange(e.target.value)}
            />
            
            <div className="config-tip" style={{ padding: '6px 8px', marginTop: '2px', border: '1px solid rgba(59, 130, 246, 0.1)', background: 'rgba(59, 130, 246, 0.03)' }}>
              <Info size={12} className="info-icon" style={{ marginTop: '1.5px', color: '#60a5fa', flexShrink: 0 }} />
              <span style={{ fontSize: '10.5px', lineHeight: 1.3, color: 'var(--text-secondary)' }}>
                💡 <strong>智能模糊匹配：</strong>可选填。若填写，只有当前网址包含该词（例如 <code>localhost</code>）时才会触发自动读取，提升隐私安全。
              </span>
            </div>
          </div>
        )}

        {/* 卡片二：是否开启过滤数据默认写入 (与卡片一联动) */}
        <div 
          className={`settings-card switch-wrapper ${!autoRead ? 'disabled' : ''}`}
          onClick={handleToggleAutoWriteFiltered}
          style={!autoRead ? { opacity: 0.5, cursor: 'not-allowed', marginTop: '12px' } : { marginTop: '12px' }}
        >
          <div className="setting-info">
            <span className="setting-label">开启筛选数据默认写入</span>
            <span className="setting-desc">加载时自动将匹配过滤的字段写入缓存箱</span>
          </div>
          <button type="button" className="btn-toggle-switch" disabled={!autoRead}>
            {autoRead && autoWriteFiltered ? (
              <ToggleRight size={28} className="switch-icon active" />
            ) : (
              <ToggleLeft size={28} className="switch-icon" />
            )}
          </button>
        </div>
      </div>

      {/* 模块：写入首选项设置 */}
      <div className="settings-section">
        <div className="section-title">
          <Globe size={14} className="icon-title" style={{ transform: 'rotate(180deg)' }} />
          <span>写入首选项</span>
        </div>
        
        {/* 卡片一：是否自动写入 */}
        <div className="settings-card switch-wrapper" onClick={handleToggleAutoWriteToPage}>
          <div className="setting-info">
            <span className="setting-label">匹配网址自动写入</span>
            <span className="setting-desc">打开插件时，若匹配指定网址则自动将暂存数据写入网页</span>
          </div>
          <button type="button" className="btn-toggle-switch">
            {autoWriteToPage ? (
              <ToggleRight size={28} className="switch-icon active" />
            ) : (
              <ToggleLeft size={28} className="switch-icon" />
            )}
          </button>
        </div>

        {/* 必填网址输入框 */}
        {autoWriteToPage && (
          <div className="settings-card url-config-card" style={{ marginTop: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <Link size={12} style={{ color: 'var(--color-primary)' }} />
              <span>匹配网址/域名 <span style={{ color: 'var(--color-danger)' }}>*必填</span></span>
            </div>
            <input
              type="text"
              className="input-new-tag"
              style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="例如: localhost 或 dev.example.com"
              value={autoWriteUrl}
              onChange={(e) => handleAutoWriteUrlChange(e.target.value)}
            />
            
            <div className="config-tip" style={{ padding: '6px 8px', marginTop: '2px', border: '1px solid rgba(59, 130, 246, 0.1)', background: 'rgba(59, 130, 246, 0.03)' }}>
              <Info size={12} className="info-icon" style={{ marginTop: '1.5px', color: '#60a5fa', flexShrink: 0 }} />
              <span style={{ fontSize: '10.5px', lineHeight: 1.3, color: 'var(--text-secondary)' }}>
                💡 <strong>智能模糊匹配：</strong>只需填写网址/域名的一部分（例如 <code>localhost</code> 或 <code>dev</code>）。当前网址包含此词即可触发自动写入，相较正则更易用安全，相较精准匹配更灵活！
              </span>
            </div>

            {!autoWriteUrl.trim() && (
              <span style={{ fontSize: '11px', color: 'var(--color-danger)', fontWeight: '500', marginTop: '4px' }}>
                ⚠️ 网址不能为空，否则自动写入将不会生效！
              </span>
            )}
          </div>
        )}
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

      {/* 模块：系统备份与同步 */}
      <div className="settings-section">
        <div className="section-title">
          <Shield size={14} className="icon-title" />
          <span>跨浏览器备份与同步</span>
        </div>
        
        <div className="settings-card backup-config-card">
          <div className="config-tip">
            <Info size={12} className="info-icon" />
            <span>导出全配置 JSON 包，可用于在 Chrome 与 Edge 或其他设备间瞬间同步账号和规则。</span>
          </div>

          <div className="backup-actions">
            <button type="button" className="btn-backup-action export" onClick={handleExportBackupClick}>
              💾 导出备份数据包
            </button>
            <button type="button" className="btn-backup-action import" onClick={triggerFileInput}>
              📥 导入外部备份包
            </button>
            <input
              type="file"
              id="backup-file-input"
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>

      {/* 底部系统信息 */}
      <div className="settings-footer">
        <Shield size={12} className="shield-icon" />
        <span>安全沙箱模式已激活 • 数据完全存储在本地加密存储中</span>
      </div>

      {/* 智能导入备份模态框 (Glassmorphic Modal) */}
      {showImportModal && (
        <div className="import-modal-overlay">
          <div className="import-modal-card">
            <div className="modal-header">
              <Shield size={16} className="modal-logo" />
              <h3>智能备份导入面板</h3>
            </div>
            
            <div className="modal-body">
              <p className="modal-desc">已成功读取外部备份包！请勾选你想要合并或覆盖的配置项：</p>
              
              <div className="import-options-list">
                {/* 账号簿选项 */}
                <div 
                  className={`import-option-item ${backupStats.accounts === 0 ? 'disabled' : ''}`}
                  onClick={() => backupStats.accounts > 0 && setImportAccounts(!importAccounts)}
                >
                  <input
                    type="checkbox"
                    checked={importAccounts}
                    disabled={backupStats.accounts === 0}
                    onChange={() => {}}
                  />
                  <div className="option-info">
                    <span className="option-label">账号簿备份数据</span>
                    <span className="option-desc">
                      {backupStats.accounts > 0 
                        ? `检测到 ${backupStats.accounts} 个账号 (将与当前账号智能合并去重)` 
                        : '未检测到任何账号数据'}
                    </span>
                  </div>
                </div>

                {/* 缓存写入箱选项 */}
                <div 
                  className={`import-option-item ${backupStats.boxItems === 0 ? 'disabled' : ''}`}
                  onClick={() => backupStats.boxItems > 0 && setImportBoxItems(!importBoxItems)}
                >
                  <input
                    type="checkbox"
                    checked={importBoxItems}
                    disabled={backupStats.boxItems === 0}
                    onChange={() => {}}
                  />
                  <div className="option-info">
                    <span className="option-label">缓存写入箱数据 (Box)</span>
                    <span className="option-desc">
                      {backupStats.boxItems > 0 
                        ? `检测到 ${backupStats.boxItems} 个暂存字段 (将与当前暂存数据合并)` 
                        : '未检测到任何暂存箱数据'}
                    </span>
                  </div>
                </div>

                {/* 网址匹配与过滤选项 */}
                <div 
                  className={`import-option-item ${backupStats.filters === 0 ? 'disabled' : ''}`}
                  onClick={() => backupStats.filters > 0 && setImportFilters(!importFilters)}
                >
                  <input
                    type="checkbox"
                    checked={importFilters}
                    disabled={backupStats.filters === 0}
                    onChange={() => {}}
                  />
                  <div className="option-info">
                    <span className="option-label">过滤字段与匹配拦截规则</span>
                    <span className="option-desc">
                      {backupStats.filters > 0 
                        ? `检测到匹配拦截配置 (将与当前规则合并去重)` 
                        : '未检测到拦截配置数据'}
                    </span>
                  </div>
                </div>

                {/* 读写偏好设置 */}
                <div 
                  className="import-option-item"
                  onClick={() => setImportSettings(!importSettings)}
                >
                  <input
                    type="checkbox"
                    checked={importSettings}
                    onChange={() => {}}
                  />
                  <div className="option-info">
                    <span className="option-label">自动读写与偏好选项</span>
                    <span className="option-desc">包含自动读取开关、自动写入网址、亮暗色模式 (将覆盖当前设置)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-modal-cancel" onClick={() => setShowImportModal(false)}>
                取消
              </button>
              <button 
                type="button" 
                className="btn-modal-confirm" 
                onClick={handleConfirmImportClick}
                disabled={!importAccounts && !importFilters && !importSettings && !importBoxItems}
              >
                安全导入并重载
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
