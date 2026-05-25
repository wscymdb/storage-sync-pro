/**
 * 校验当前网址是否与配置的匹配规则相匹配
 * 支持普通的子串模糊匹配，也支持带 * 的通配符匹配（例如 *.hunan-data.com）
 * 
 * @param currentUrl 当前浏览器的完整 URL
 * @param pattern 用户填写的匹配模式
 * @returns 是否匹配成功
 */
export const matchUrlPattern = (currentUrl: string, pattern: string): boolean => {
  const cleanPattern = pattern.trim().toLowerCase();
  // NOTE: 若配置为空，则默认对所有网页生效（全量匹配）
  if (!cleanPattern) return true;

  const cleanUrl = currentUrl.toLowerCase();

  // NOTE: 如果包含通配符 *，需要将其转换为正则表达式进行匹配
  if (cleanPattern.includes('*')) {
    // 1. 将正则中的特殊字符进行安全转义，保留 * 不转义
    const escaped = cleanPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    // 2. 将通配符 * 替换为正则的 .*
    const regexStr = escaped.replace(/\*/g, '.*');
    
    try {
      const regex = new RegExp(regexStr);
      return regex.test(cleanUrl);
    } catch (e) {
      // FIXME: 防止极端不合规的输入导致正则实例化失败
      console.error('网址匹配正则解析失败:', e);
      return false;
    }
  }

  // NOTE: 若不包含通配符 *，退化为快速高效的原生 includes 子串查找
  return cleanUrl.includes(cleanPattern);
};
