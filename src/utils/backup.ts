/**
 * Storage Sync Pro 备份与数据同步工具服务
 * NOTE: 将底层的打包、下载以及去重合并等纯数据操作与 React UI 视图剥离，提升模块内聚度与复用性。
 */

// 待备份的完整 storage 键列表
const BACKUP_STORAGE_KEYS = [
  'sync_account_items',
  'sync_box_items',
  'sync_auto_read',
  'sync_auto_read_url',
  'sync_filter_keys',
  'sync_auto_write_filtered',
  'sync_auto_write_to_page',
  'sync_auto_write_url',
  'sync_read_filter_rules',
  'sync_read_filters',
  'sync_theme'
];

/**
 * 辅助获取单个 storage 键值
 */
export const getSingleStorageKey = (key: string, isExtension: boolean): Promise<any> => {
  return new Promise((resolve) => {
    if (isExtension) {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    } else {
      const val = localStorage.getItem(key);
      if (val !== null) {
        try {
          resolve(JSON.parse(val));
        } catch {
          resolve(val);
        }
      } else {
        resolve(null);
      }
    }
  });
};

/**
 * 异步提取当前插件/浏览器中的所有已知配置数据
 */
export const getAllStorageData = (isExtension: boolean): Promise<Record<string, any>> => {
  return new Promise((resolve) => {
    if (isExtension) {
      chrome.storage.local.get(BACKUP_STORAGE_KEYS, (result) => {
        resolve(result);
      });
    } else {
      const result: Record<string, any> = {};
      BACKUP_STORAGE_KEYS.forEach(k => {
        const val = localStorage.getItem(k);
        if (val !== null) {
          try {
            result[k] = JSON.parse(val);
          } catch {
            result[k] = val;
          }
        }
      });
      resolve(result);
    }
  });
};

/**
 * 打包并生成 JSON 备份包触发浏览器下载
 */
export const exportBackupData = async (isExtension: boolean): Promise<boolean> => {
  try {
    const data = await getAllStorageData(isExtension);
    const backupPackage = {
      version: "1.0.0",
      export_at: new Date().toISOString(),
      data: data
    };
    
    const blob = new Blob([JSON.stringify(backupPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `storage_sync_pro_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('备份包导出异常:', err);
    return false;
  }
};

interface ImportOptions {
  importAccounts: boolean;
  importFilters: boolean;
  importSettings: boolean;
}

/**
 * 执行最终的智能去重合并与覆盖导入
 * @param pendingBackupData 上传解析后的备份配置对象
 * @param options 选择合并导入的模块项
 * @param isExtension 是否在 Chrome/Edge 扩展沙箱环境下
 */
export const mergeAndImportBackup = async (
  pendingBackupData: any,
  options: ImportOptions,
  isExtension: boolean
): Promise<boolean> => {
  if (!pendingBackupData) return false;

  try {
    const updatePayload: Record<string, any> = {};
    const { importAccounts, importFilters, importSettings } = options;

    // 1. 智能去重合并账号簿
    if (importAccounts) {
      const localAccounts = (await getSingleStorageKey('sync_account_items', isExtension)) || [];
      const backupAccounts = pendingBackupData.sync_account_items || [];
      
      const mergedAccounts = [...localAccounts];
      backupAccounts.forEach((backupItem: any) => {
        // 以网址和账号组成的双向主键进行排重合并，既不丢失已有的新卡片，也能新增备份包里的项
        const isDuplicate = localAccounts.some((localItem: any) => 
          (localItem.url || '').trim().toLowerCase() === (backupItem.url || '').trim().toLowerCase() &&
          (localItem.account || '').trim() === (backupItem.account || '').trim()
        );
        if (!isDuplicate) {
          mergedAccounts.push(backupItem);
        }
      });
      updatePayload['sync_account_items'] = mergedAccounts;
    }

    // 2. 去重合并过滤字段与模糊拦截规则
    if (importFilters) {
      // 字段 key 数组合并去重
      const localKeys = (await getSingleStorageKey('sync_filter_keys', isExtension)) || [];
      const backupKeys = pendingBackupData.sync_filter_keys || [];
      updatePayload['sync_filter_keys'] = Array.from(new Set([...localKeys, ...backupKeys]));

      // 模糊匹配规则合并去重 (以匹配 pattern 为主键)
      const localRules = (await getSingleStorageKey('sync_read_filter_rules', isExtension)) || [];
      const backupRules = pendingBackupData.sync_read_filter_rules || [];
      const mergedRules = [...localRules];
      backupRules.forEach((bRule: any) => {
        const exists = localRules.some((lRule: any) => lRule.pattern === bRule.pattern);
        if (!exists) {
          mergedRules.push(bRule);
        }
      });
      updatePayload['sync_read_filter_rules'] = mergedRules;

      // 临时过滤禁用映射表增量覆盖合并
      const localFilters = (await getSingleStorageKey('sync_read_filters', isExtension)) || {};
      const backupFilters = pendingBackupData.sync_read_filters || {};
      updatePayload['sync_read_filters'] = { ...localFilters, ...backupFilters };
    }

    // 3. 系统配置直接覆盖
    if (importSettings) {
      const settingKeys = [
        'sync_auto_read',
        'sync_auto_read_url',
        'sync_auto_write_filtered',
        'sync_auto_write_to_page',
        'sync_auto_write_url',
        'sync_theme'
      ];
      settingKeys.forEach(key => {
        if (pendingBackupData[key] !== undefined) {
          updatePayload[key] = pendingBackupData[key];
        }
      });
    }

    // 执行落盘保存写入
    return new Promise((resolve) => {
      if (isExtension) {
        chrome.storage.local.set(updatePayload, () => {
          resolve(true);
        });
      } else {
        Object.entries(updatePayload).forEach(([key, val]) => {
          localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
        });
        resolve(true);
      }
    });
  } catch (err) {
    console.error('备份合并导入异常:', err);
    return false;
  }
};
