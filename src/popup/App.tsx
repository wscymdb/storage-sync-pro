import React, { useState, useEffect } from "react";
import { Eye, Box, User, Settings, X } from "lucide-react";
import ReadPanel from "../components/ReadPanel";
import WritePanel from "../components/WritePanel";
import AccountPanel from "../components/AccountPanel";
import SettingsPanel from "../components/SettingsPanel";
import Toast, { ToastType } from "../components/Toast";
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

  const isExtension =
    typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

  // 初始化从 chrome.storage.local / localStorage 读取已缓存数据、主题及激活 Tab 配置
  useEffect(() => {
    if (isExtension) {
      chrome.storage.local.get(
        ["sync_box_items", "sync_theme", "sync_active_tab"],
        (result) => {
          if (result.sync_box_items) {
            setBoxItems(result.sync_box_items);
          }
          if (result.sync_theme) {
            setTheme(result.sync_theme);
          }
          if (result.sync_active_tab) {
            setActiveTab(result.sync_active_tab);
          }
        },
      );
    } else {
      // 浏览器预览备用
      const localData = localStorage.getItem("sync_box_items");
      if (localData) {
        try {
          setBoxItems(JSON.parse(localData));
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

  // 添加到缓存箱
  const handleAddToBox = (newItems: Record<string, string>) => {
    const updated = { ...boxItems, ...newItems };
    saveToStorage(updated);
    showToast(
      `成功将 ${Object.keys(newItems).length} 个字段存入缓存箱`,
      "success",
    );
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
          {activeTab === "read" && (
            <ReadPanel
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
