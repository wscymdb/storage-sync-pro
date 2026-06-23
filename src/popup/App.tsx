import React, { useState, useEffect } from "react";
import { Eye, Box, User, Settings, X } from "lucide-react";
import ReadPanel from "../components/ReadPanel";
import WritePanel from "../components/WritePanel";
import AccountPanel from "../components/AccountPanel";
import SettingsPanel from "../components/SettingsPanel";
import Toast, { ToastType } from "../components/Toast";
import { matchUrlPattern } from "../utils/urlMatcher";
import "./App.less";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"read" | "write" | "account">(
    "read",
  );
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [boxItems, setBoxItems] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Lifted settings states
  const [filterKeys, setFilterKeys] = useState<string[]>(['authorization', 'authToken']);
  const [autoRead, setAutoRead] = useState(true);
  const [autoWriteFiltered, setAutoWriteFiltered] = useState(false);
  const [autoReadUrl, setAutoReadUrl] = useState('');
  const [autoWriteToPage, setAutoWriteToPage] = useState(false);
  const [autoWriteUrl, setAutoWriteUrl] = useState('');

  const isExtension =
    typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

  // 初始化从 chrome.storage.local / localStorage 读取已缓存数据、主题及所有系统设置
  useEffect(() => {
    const keysToGet = [
      "sync_box_items",
      "sync_theme",
      "sync_active_tab",
      "sync_auto_write_to_page",
      "sync_auto_write_url",
      "sync_auto_read",
      "sync_filter_keys",
      "sync_auto_write_filtered",
      "sync_auto_read_url"
    ];
    if (isExtension) {
      chrome.storage.local.get(keysToGet, (result) => {
        if (result.sync_box_items) {
          setBoxItems(result.sync_box_items);
        }
        if (result.sync_theme) {
          setTheme(result.sync_theme);
        }
        if (result.sync_active_tab) {
          setActiveTab(result.sync_active_tab);
        }
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

        // 触发加载时自动写入检查 (暂存箱无数据时不写入，不与设置冲突)
        handleAutoWriteCheck(
          result.sync_box_items || {},
          result.sync_auto_write_to_page || false,
          result.sync_auto_write_url || ""
        );
        setSettingsLoaded(true);
      });
    } else {
      // 浏览器预览备用
      let loadedBox = {};
      const localData = localStorage.getItem("sync_box_items");
      if (localData) {
        try {
          loadedBox = JSON.parse(localData);
          setBoxItems(loadedBox);
        } catch {}
      }
      const localTheme = localStorage.getItem("sync_theme") as "dark" | "light";
      if (localTheme) {
        setTheme(localTheme);
      }
      const localTab = localStorage.getItem("sync_active_tab") as
        | "read"
        | "write"
        | "account";
      if (localTab) {
        setActiveTab(localTab);
      }
      
      const savedAutoRead = localStorage.getItem("sync_auto_read");
      if (savedAutoRead !== null) {
        setAutoRead(savedAutoRead === "true");
      }
      const savedFilterKeys = localStorage.getItem("sync_filter_keys");
      if (savedFilterKeys) {
        try {
          setFilterKeys(JSON.parse(savedFilterKeys));
        } catch {}
      }
      const savedAutoWriteFiltered = localStorage.getItem("sync_auto_write_filtered");
      if (savedAutoWriteFiltered !== null) {
        setAutoWriteFiltered(savedAutoWriteFiltered === "true");
      }
      const savedAutoWrite = localStorage.getItem("sync_auto_write_to_page") === "true";
      const savedAutoWriteUrl = localStorage.getItem("sync_auto_write_url") || "";
      setAutoWriteToPage(savedAutoWrite);
      setAutoWriteUrl(savedAutoWriteUrl);

      const savedAutoReadUrl = localStorage.getItem("sync_auto_read_url");
      if (savedAutoReadUrl !== null) {
        setAutoReadUrl(savedAutoReadUrl);
      }
      
      // 触发自动写入 Mock 检查
      handleAutoWriteCheck(loadedBox, savedAutoWrite, savedAutoWriteUrl);
      setSettingsLoaded(true);
    }
  }, []);

  // 监听并持久化当前激活的 Tab 位置
  useEffect(() => {
    if (isExtension) {
      chrome.storage.local.set({ sync_active_tab: activeTab });
    } else {
      localStorage.setItem("sync_active_tab", activeTab);
    }
  }, [activeTab]);

  // 监听主题变化并应用于 body 节点
  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  // 修改主题回调
  const handleThemeChange = (nextTheme: "dark" | "light") => {
    setTheme(nextTheme);
    if (isExtension) {
      chrome.storage.local.set({ sync_theme: nextTheme });
    } else {
      localStorage.setItem("sync_theme", nextTheme);
    }
  };

  // State setters that persist to storage
  const handleFilterKeysChange = (newKeys: string[]) => {
    setFilterKeys(newKeys);
    if (isExtension) {
      chrome.storage.local.set({ sync_filter_keys: newKeys });
    } else {
      localStorage.setItem("sync_filter_keys", JSON.stringify(newKeys));
    }
  };

  const handleAutoReadChange = (val: boolean) => {
    setAutoRead(val);
    if (isExtension) {
      chrome.storage.local.set({ sync_auto_read: val });
    } else {
      localStorage.setItem("sync_auto_read", String(val));
    }
  };

  const handleAutoWriteFilteredChange = (val: boolean) => {
    setAutoWriteFiltered(val);
    if (isExtension) {
      chrome.storage.local.set({ sync_auto_write_filtered: val });
    } else {
      localStorage.setItem("sync_auto_write_filtered", String(val));
    }
  };

  const handleAutoReadUrlChange = (val: string) => {
    setAutoReadUrl(val);
    if (isExtension) {
      chrome.storage.local.set({ sync_auto_read_url: val });
    } else {
      localStorage.setItem("sync_auto_read_url", val);
    }
  };

  const handleAutoWriteToPageChange = (val: boolean) => {
    setAutoWriteToPage(val);
    if (isExtension) {
      chrome.storage.local.set({ sync_auto_write_to_page: val });
    } else {
      localStorage.setItem("sync_auto_write_to_page", String(val));
    }
  };

  const handleAutoWriteUrlChange = (val: string) => {
    setAutoWriteUrl(val);
    if (isExtension) {
      chrome.storage.local.set({ sync_auto_write_url: val });
    } else {
      localStorage.setItem("sync_auto_write_url", val);
    }
  };

  // 内部辅助保存函数
  const saveToStorage = (updatedItems: Record<string, string>) => {
    setBoxItems(updatedItems);
    if (isExtension) {
      chrome.storage.local.set({ sync_box_items: updatedItems });
    } else {
      localStorage.setItem("sync_box_items", JSON.stringify(updatedItems));
    }
  };

  // 提示框触发
  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type });
  };

  // 检查并执行自动写入逻辑 (暂存箱无数据则跳过)
  const handleAutoWriteCheck = async (
    items: Record<string, string>,
    enabled: boolean,
    matchUrl: string
  ) => {
    if (!enabled || Object.keys(items).length === 0 || !matchUrl.trim()) {
      return;
    }

    if (isExtension) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id || !tab.url) return;

        const currentUrl = tab.url;

        // NOTE: 使用智能通配符网址校验
        if (matchUrlPattern(currentUrl, matchUrl)) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (data) => {
              Object.entries(data).forEach(([key, val]) => {
                localStorage.setItem(key, val);
              });
            },
            args: [items]
          });
          
          showToast(
            `[自动写入] 已向匹配网址自动写入暂存箱的 ${Object.keys(items).length} 个字段`,
            "success"
          );
        }
      } catch (err) {
        console.error("自动写入失败:", err);
      }
    } else {
      // 浏览器开发预览模式 Mock
      const currentUrl = window.location.href;
      if (matchUrlPattern(currentUrl, matchUrl) || matchUrl.trim().toLowerCase() === "localhost") {
        showToast(
          `[自动写入] 已自动写入暂存箱的 ${Object.keys(items).length} 个字段 (开发预览模式)`,
          "success"
        );
      }
    }
  };

  // 添加到缓存箱
  const handleAddToBox = (newItems: Record<string, string>, isAutoSync: boolean = false) => {
    const updated = { ...boxItems, ...newItems };
    saveToStorage(updated);
    if (isAutoSync) {
      showToast(
        `[自动同步] 已默认将读取的 ${Object.keys(newItems).length} 个筛选字段写入缓存箱`,
        "success"
      );
    } else {
      showToast(
        `成功将 ${Object.keys(newItems).length} 个字段存入缓存箱`,
        "success"
      );
    }
  };

  // 从缓存箱移除
  const handleRemoveFromBox = (key: string) => {
    const updated = { ...boxItems };
    delete updated[key];
    saveToStorage(updated);
    showToast("已从缓存箱移除", "info");
  };

  // 更新缓存箱项
  const handleUpdateBoxItem = (
    oldKey: string,
    newKey: string,
    newValue: string,
  ) => {
    const updated = { ...boxItems };
    if (oldKey !== newKey) {
      delete updated[oldKey];
    }
    updated[newKey] = newValue;
    saveToStorage(updated);
  };

  // 手动添加单个缓存
  const handleAddBoxItem = (key: string, value: string) => {
    const updated = { ...boxItems, [key]: value };
    saveToStorage(updated);
  };

  // 清空缓存箱
  const handleClearBox = () => {
    saveToStorage({});
    showToast("缓存箱已清空", "info");
  };

  const boxCount = Object.keys(boxItems).length;

  return (
    <div className="app-container">
      {/* 顶部 Header，微光背景 */}
      <header className="app-header">
        <div className="brand">
          <div className="logo-glow">
            <span className="logo-inner" />
          </div>
          <div className="title-area">
            <h1>Storage Sync Pro</h1>
            <p>localStorage 跨页同步助手</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`btn-header-action ${showSettings ? "active" : ""}`}
            onClick={() => setShowSettings(!showSettings)}
            title="系统设置"
          >
            <Settings size={14} />
          </button>
        </div>
      </header>

      {/* 精致的 Tab 导航 */}
      <nav className="tab-navigation">
        {/* 滑动背景块指示器 */}
        <div className={`tab-indicator active-${activeTab}`} />
        <button
          className={`tab-btn ${activeTab === "read" ? "active" : ""}`}
          onClick={() => setActiveTab("read")}
        >
          <Eye size={13} />
          读取数据 (Read)
        </button>
        <button
          className={`tab-btn ${activeTab === "write" ? "active" : ""}`}
          onClick={() => setActiveTab("write")}
        >
          <Box size={13} />
          缓存写入箱 (Box)
          {boxCount > 0 && <span className="tab-badge">{boxCount}</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === "account" ? "active" : ""}`}
          onClick={() => setActiveTab("account")}
        >
          <User size={13} />
          账号簿 (Accounts)
        </button>
      </nav>

      {/* 主面板内容区，带毛玻璃与微光阴影 */}
      <main className="app-content-box">
        <div className="tab-panel-wrapper" key={activeTab}>
          {activeTab === "read" && settingsLoaded && (
            <ReadPanel
              filterKeys={filterKeys}
              autoRead={autoRead}
              autoWriteFiltered={autoWriteFiltered}
              autoReadUrl={autoReadUrl}
              onAddToBox={handleAddToBox}
              showToast={showToast}
              onNavigateToSettings={() => setShowSettings(true)}
            />
          )}
          {activeTab === "write" && (
            <WritePanel
              boxItems={boxItems}
              onRemoveFromBox={handleRemoveFromBox}
              onUpdateBoxItem={handleUpdateBoxItem}
              onClearBox={handleClearBox}
              onAddBoxItem={handleAddBoxItem}
              showToast={showToast}
            />
          )}
          {activeTab === "account" && <AccountPanel showToast={showToast} />}
        </div>
      </main>

      {/* 全高独立系统设置抽屉 (Sliding Drawer Overlay) */}
      <div
        className={`settings-drawer-overlay ${showSettings ? "visible" : ""}`}
      >
        <div className="drawer-header">
          <div className="drawer-title-area">
            <Settings size={14} className="drawer-logo" />
            <span className="drawer-title">系统配置选项</span>
          </div>
          <button
            className="btn-drawer-close"
            onClick={() => setShowSettings(false)}
            title="返回"
          >
            <X size={15} />
          </button>
        </div>
        <div className="drawer-body">
          <SettingsPanel
            showToast={showToast}
            theme={theme}
            onThemeChange={handleThemeChange}
            autoRead={autoRead}
            setAutoRead={handleAutoReadChange}
            filterKeys={filterKeys}
            setFilterKeys={handleFilterKeysChange}
            autoWriteFiltered={autoWriteFiltered}
            setAutoWriteFiltered={handleAutoWriteFilteredChange}
            autoWriteToPage={autoWriteToPage}
            setAutoWriteToPage={handleAutoWriteToPageChange}
            autoWriteUrl={autoWriteUrl}
            setAutoWriteUrl={handleAutoWriteUrlChange}
            autoReadUrl={autoReadUrl}
            setAutoReadUrl={handleAutoReadUrlChange}
          />
        </div>
      </div>

      {/* 全局 Toast 通知 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={2500}
        />
      )}
    </div>
  );
};

export default App;
