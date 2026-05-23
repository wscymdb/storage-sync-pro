import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Box, Check, Copy, ChevronDown, ChevronUp, AlertCircle, FileJson, Settings } from 'lucide-react';
import './index.less';

interface ReadPanelProps {
  onAddToBox: (items: Record<string, string>, isAutoSync?: boolean) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigateToSettings: () => void;
}

const ReadPanel: React.FC<ReadPanelProps> = ({ onAddToBox, showToast, onNavigateToSettings }) => {
  const [loading, setLoading] = useState(false);
  const [currentDomain, setCurrentDomain] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [localStorageData, setLocalStorageData] = useState<Record<string, string>>({});
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // 筛选字段相关状态，默认值为 authorization 和 authToken
  const [filterKeys, setFilterKeys] = useState<string[]>(['authorization', 'authToken']);

  const isExtension = typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting;

  // 读取 localStorage
  const readData = async (readAll: boolean = false, customFilters?: string[], autoWriteOnSuccess: boolean = false) => {
    setLoading(true);
    setSelectedKeys(new Set());
    setExpandedKeys(new Set());

    // 决定本次要过滤的键值列表。如果是读取所有，则为 []，否则如果传入了 customFilters 则用其覆盖，再次则取当前状态 filterKeys
    const activeFilters = readAll ? [] : (customFilters !== undefined ? customFilters : filterKeys);

    if (!isExtension) {
      // 浏览器开发/预览环境 Mock 数据
      setTimeout(() => {
        const mockFullData = {
          'token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJ1c2VybmFtZSI6ImFudGlncmF2aXR5IiwiZXhwIjoxNjg1MDk3NjAwfQ.signature',
          'theme': 'dark',
          'user_profile': JSON.stringify({
            id: 123,
            name: '陈宇梦',
            roles: ['admin', 'developer'],
            settings: { lang: 'zh-CN', notify: true }
          }, null, 2),
          'cart_items_count': '5',
          'is_new_user': 'false',
          'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJ1c2VybmFtZSI6ImFudGlncmF2aXR5IiwiZXhwIjoxNjg1MDk3NjAwfQ.signature',
          'authToken': 'mock-authToken-value-999'
        };

        let filteredData: Record<string, string> = {};
        if (activeFilters.length > 0) {
          activeFilters.forEach(k => {
            if (mockFullData[k as keyof typeof mockFullData] !== undefined) {
              filteredData[k] = mockFullData[k as keyof typeof mockFullData];
            }
          });
        } else {
          filteredData = mockFullData;
        }

        setLocalStorageData(filteredData);
        setCurrentDomain('localhost:3000 (预览模式)');
        setLoading(false);
        showToast(readAll ? '已读取全部数据 (模拟数据)' : '已按筛选字段读取 (模拟数据)', 'success');
        
        // 自动同步至缓存箱
        if (autoWriteOnSuccess && Object.keys(filteredData).length > 0) {
          onAddToBox(filteredData, true);
        }
      }, 600);
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        showToast('未找到活动标签页', 'error');
        setLoading(false);
        return;
      }

      // 获取域名
      if (tab.url) {
        try {
          const urlObj = new URL(tab.url);
          setCurrentDomain(urlObj.host);
        } catch {
          setCurrentDomain(tab.title || '未知页面');
        }
      }

      let results;
      if (activeFilters.length > 0) {
        // 仅读取筛选的 key-value
        results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (keysToRead) => {
            const data: Record<string, string> = {};
            keysToRead.forEach(key => {
              const val = localStorage.getItem(key);
              if (val !== null) {
                data[key] = val;
              }
            });
            return data;
          },
          args: [activeFilters]
        });
      } else {
        // 读取所有 key-value
        results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const data: Record<string, string> = {};
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key) {
                data[key] = localStorage.getItem(key) || '';
              }
            }
            return data;
          }
        });
      }

      const data = results[0]?.result || {};
      setLocalStorageData(data);
      const count = Object.keys(data).length;
      showToast(readAll ? `成功读取全部 ${count} 条 localStorage 数据` : `已读取匹配筛选的 ${count} 条数据`, 'success');
      
      // 自动同步至缓存箱
      if (autoWriteOnSuccess && count > 0) {
        onAddToBox(data, true);
      }
    } catch (err) {
      console.error(err);
      showToast('读取失败，请确认页面是否已加载且有权限', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 初始化从 chrome.storage.local / localStorage 中加载并读取数据
  useEffect(() => {
    const init = async () => {
      let keys = ['authorization', 'authToken'];
      let autoRead = true;
      let autoWriteFiltered = false;
      if (isExtension) {
        try {
          const result = await chrome.storage.local.get(['sync_filter_keys', 'sync_auto_read', 'sync_auto_write_filtered']);
          if (result.sync_filter_keys) {
            keys = result.sync_filter_keys;
          }
          if (result.sync_auto_read !== undefined) {
            autoRead = result.sync_auto_read;
          }
          if (result.sync_auto_write_filtered !== undefined) {
            autoWriteFiltered = result.sync_auto_write_filtered;
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        const saved = localStorage.getItem('sync_filter_keys');
        if (saved) {
          try {
            keys = JSON.parse(saved);
          } catch {}
        }
        const savedAutoRead = localStorage.getItem('sync_auto_read');
        if (savedAutoRead !== null) {
          autoRead = savedAutoRead === 'true';
        }
        const savedAutoWriteFiltered = localStorage.getItem('sync_auto_write_filtered');
        if (savedAutoWriteFiltered !== null) {
          autoWriteFiltered = savedAutoWriteFiltered === 'true';
        }
      }
      setFilterKeys(keys);
      // 根据“默认自动读取”设置决定是否触发初次读取
      if (autoRead) {
        await readData(false, keys, autoWriteFiltered);
      }
    };
    init();
  }, []);

  // 搜索过滤后的键
  const filteredKeys = Object.keys(localStorageData).filter(key =>
    key.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    if (selectedKeys.size === filteredKeys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredKeys));
    }
  };

  // 展开/收起 JSON
  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedKeys(newExpanded);
  };

  // 存入缓存箱
  const handleSaveToBox = () => {
    if (selectedKeys.size === 0) {
      showToast('请先选择要保存的字段', 'warning');
      return;
    }

    const itemsToSave: Record<string, string> = {};
    selectedKeys.forEach(key => {
      itemsToSave[key] = localStorageData[key];
    });

    onAddToBox(itemsToSave);
    setSelectedKeys(new Set());
  };

  // 一键复制单个值
  const handleCopySingle = (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(val);
    showToast('已复制到剪贴板', 'success');
  };

  // 尝试解析 JSON 格式化输出
  const formatValue = (val: string) => {
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === 'object' && parsed !== null) {
        return JSON.stringify(parsed, null, 2);
      }
    } catch {}
    return val;
  };

  // 判断是否为 JSON 字符串
  const isJsonString = (val: string) => {
    if ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
      try {
        const parsed = JSON.parse(val);
        return typeof parsed === 'object' && parsed !== null;
      } catch {}
    }
    return false;
  };

  return (
    <div className="panel-container">
      {/* 头部信息域 */}
      <div className="domain-info-bar">
        <div className="domain-text">
          <span className="dot" />
          <span className="label">当前来源页:</span>
          <span className="domain" title={currentDomain}>{currentDomain || '未检测到页面'}</span>
        </div>
        <div className="domain-actions">
          <button
            className="btn-icon settings-navigation"
            onClick={onNavigateToSettings}
            title="系统配置 (配置默认读取和筛选键)"
          >
            <Settings size={13} />
          </button>
          <button
            className="btn-read-all"
            onClick={() => readData(true)}
            disabled={loading}
            title="读取页面所有 localStorage 字段"
          >
            读取所有
          </button>
          <button
            className={`btn-icon ${loading ? 'spinning' : ''}`}
            onClick={() => readData(false)}
            disabled={loading}
            title="按筛选字段读取"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* 搜索和全选工具栏 */}
      <div className="toolbar">
        <div className="search-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="input-search"
            placeholder="搜索 Key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {filteredKeys.length > 0 && (
          <button className="btn-select-all" onClick={handleSelectAll}>
            {selectedKeys.size === filteredKeys.length ? '取消全选' : '本页全选'}
          </button>
        )}
      </div>

      {/* 数据展示列表 */}
      <div className="list-scroll-area">
        {loading ? (
          <div className="empty-state">
            <RefreshCw className="spinning anim-pulse" size={24} style={{ color: 'var(--color-primary)' }} />
            <p>正在读取页面 localStorage...</p>
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={24} style={{ color: 'var(--text-muted)' }} />
            <p>
              {searchQuery 
                ? '没有找到匹配的字段' 
                : Object.keys(localStorageData).length === 0 
                  ? '未读取数据。请点击右侧刷新按钮或在设置中开启自动读取' 
                  : '当前页面 localStorage 匹配结果为空'}
            </p>
          </div>
        ) : (
          <div className="storage-list">
            {filteredKeys.map((key) => {
              const val = localStorageData[key];
              const isJson = isJsonString(val);
              const isExpanded = expandedKeys.has(key);
              const isSelected = selectedKeys.has(key);

              return (
                <div key={key} className={`storage-item ${isSelected ? 'selected' : ''}`}>
                  <div className="item-header" onClick={() => handleSelectKey(key)}>
                    <label className="checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectKey(key)}
                      />
                      <span className="custom-checkbox">
                        {isSelected && <Check size={10} strokeWidth={4} />}
                      </span>
                    </label>
                    <div className="key-details">
                      <span className="key-text" title={key}>{key}</span>
                      <div className="badges">
                        {isJson && (
                          <span className="badge json" title="JSON 对象">
                            <FileJson size={10} style={{ marginRight: '2px' }} />
                            JSON
                          </span>
                        )}
                        <span className="badge size">{val.length} bytes</span>
                      </div>
                    </div>
                    <div className="actions">
                      <button className="btn-item-action" onClick={(e) => handleCopySingle(e, val)} title="复制 Value">
                        <Copy size={12} />
                      </button>
                      {isJson && (
                        <button
                          className={`btn-item-action toggle ${isExpanded ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(key);
                          }}
                          title={isExpanded ? "收起" : "展开 JSON"}
                        >
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 展开的 Value */}
                  {(!isJson || !isExpanded) && (
                    <div className="item-value-preview" onClick={() => handleSelectKey(key)}>
                      {val || <span className="empty-value">空字符串</span>}
                    </div>
                  )}

                  {isJson && isExpanded && (
                    <div className="item-value-expanded">
                      <pre><code>{formatValue(val)}</code></pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部浮动操作箱 */}
      <div className="action-bar">
        <div className="selected-count">
          已选择 <span>{selectedKeys.size}</span> 个字段
        </div>
        <button
          className={`btn-primary glow ${selectedKeys.size === 0 ? 'disabled' : ''}`}
          disabled={selectedKeys.size === 0}
          onClick={handleSaveToBox}
        >
          <Box size={14} />
          存入缓存箱
        </button>
      </div>
    </div>
  );
};

export default ReadPanel;
