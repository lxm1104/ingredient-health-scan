import { logger } from '../config/database.js';

/**
 * 字符串工具类 - 用于产品去重的相似度计算
 */

/**
 * 计算编辑距离（Levenshtein Distance）
 * @param {string} str1 - 第一个字符串
 * @param {string} str2 - 第二个字符串  
 * @returns {number} 编辑距离
 */
export function levenshteinDistance(str1, str2) {
  if (!str1 || !str2) return Math.max(str1?.length || 0, str2?.length || 0);
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  // 创建二维数组
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  // 初始化第一行和第一列
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  // 计算编辑距离
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // 删除
        matrix[i][j - 1] + 1,     // 插入
        matrix[i - 1][j - 1] + cost // 替换
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * 字符串预处理 - 标准化字符串以便比较
 * @param {string} str - 输入字符串
 * @returns {string} 预处理后的字符串
 */
export function preprocessString(str) {
  if (!str || typeof str !== 'string') return '';
  
  let processed = str;
  
  // 转换为小写
  processed = processed.toLowerCase();
  
  // 去除多余空格和常见标点符号（修复正则表达式）
  processed = processed.replace(/[\s\-_\.\/\(\)\[\]【】（）·]/g, '');
  
  // 去除常见修饰词
  const removeWords = [
    '新装', '升级版', '经典款', '限量版', '特惠装', '家庭装', 
    '便携装', '迷你装', '大包装', '小包装', '原味', '经典',
    '新品', '热卖', '推荐', '精选', '优质', '健康',
    '天然', '有机', '绿色', '营养', '美味', '香浓'
  ];
  
  for (const word of removeWords) {
    processed = processed.replace(new RegExp(word, 'g'), '');
  }
  
  // 标准化单位表示
  const unitMappings = {
    '毫升': 'ml',
    '升': 'l', 
    '克': 'g',
    '千克': 'kg',
    '斤': 'kg',
    '两': 'g'
  };
  
  for (const [chinese, english] of Object.entries(unitMappings)) {
    processed = processed.replace(new RegExp(chinese, 'g'), english);
  }
  
  return processed.trim();
}

/**
 * 计算字符串相似度（基于编辑距离）
 * @param {string} str1 - 第一个字符串
 * @param {string} str2 - 第二个字符串
 * @returns {number} 相似度 (0-1之间，1表示完全相同)
 */
export function calculateSimilarity(str1, str2) {
  if (!str1 && !str2) return 1; // 都为空，认为相同
  if (!str1 || !str2) return 0; // 一个为空，认为不同
  
  // 预处理字符串
  const processed1 = preprocessString(str1);
  const processed2 = preprocessString(str2);
  
  if (processed1 === processed2) return 1; // 预处理后完全相同
  
  // 计算编辑距离
  const distance = levenshteinDistance(processed1, processed2);
  const maxLength = Math.max(processed1.length, processed2.length);
  
  if (maxLength === 0) return 1;
  
  // 转换为相似度 (0-1)
  const similarity = 1 - (distance / maxLength);
  
  return Math.max(0, similarity);
}

/**
 * 检查字符串包含关系
 * @param {string} str1 - 第一个字符串  
 * @param {string} str2 - 第二个字符串
 * @returns {boolean} 是否互相包含或有显著重叠
 */
export function checkStringContainment(str1, str2) {
  if (!str1 || !str2) return false;
  
  const processed1 = preprocessString(str1);
  const processed2 = preprocessString(str2);
  
  if (processed1.length < 2 || processed2.length < 2) return false;
  
  // 检查是否互相包含
  if (processed1.includes(processed2) || processed2.includes(processed1)) {
    return true;
  }
  
  // 检查是否有显著的公共子串
  const minLength = Math.min(processed1.length, processed2.length);
  const threshold = Math.max(2, Math.floor(minLength * 0.6));
  
  for (let i = 0; i <= processed1.length - threshold; i++) {
    const substring = processed1.substring(i, i + threshold);
    if (processed2.includes(substring)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 提取配料表的主要成分（前N个）
 * @param {string} ingredientsList - 配料表文本
 * @param {number} topN - 提取前N个成分，默认3个
 * @returns {Array<string>} 主要成分数组
 */
export function extractMainIngredients(ingredientsList, topN = 3) {
  if (!ingredientsList || typeof ingredientsList !== 'string') return [];
  
  // 常见的配料分隔符
  const separators = [',', '，', ';', '；', '、', '|', ' '];
  let ingredients = [ingredientsList];
  
  // 依次使用分隔符拆分
  for (const sep of separators) {
    const newIngredients = [];
    for (const ingredient of ingredients) {
      newIngredients.push(...ingredient.split(sep));
    }
    ingredients = newIngredients;
  }
  
  // 清理和过滤成分
  const cleanedIngredients = ingredients
    .map(ingredient => ingredient.trim())
    .filter(ingredient => ingredient.length > 0)
    .filter(ingredient => {
      // 过滤掉明显不是配料的内容
      const excludePatterns = [
        /^\d+[%％]?$/, // 纯数字或百分比
        /^[<>≤≥]+/, // 比较符号开头
        /生产日期|保质期|净含量|规格/, // 产品信息
        /^[\(\)（）\[\]【】]+$/ // 纯括号
      ];
      
      return !excludePatterns.some(pattern => pattern.test(ingredient));
    })
    .map(ingredient => {
      // 去除括号内容和特殊标记 - 修复处理逻辑
      let cleaned = ingredient;
      
      // 去除括号及其内容，但保留主要部分
      cleaned = cleaned.replace(/\([^)]*\)/g, ''); // 去除圆括号内容
      cleaned = cleaned.replace(/（[^）]*）/g, ''); // 去除中文圆括号内容
      cleaned = cleaned.replace(/\[[^\]]*\]/g, ''); // 去除方括号内容
      cleaned = cleaned.replace(/【[^】]*】/g, ''); // 去除中文方括号内容
      
      // 去除特殊标记
      cleaned = cleaned.replace(/[<>≤≥]+\d+.*$/, '');
      
      return cleaned.trim();
    })
    .filter(ingredient => ingredient.length > 0);
  
  // 返回前N个主要成分
  return cleanedIngredients.slice(0, topN);
}

/**
 * 计算配料表相似度
 * @param {string} ingredients1 - 第一个配料表
 * @param {string} ingredients2 - 第二个配料表
 * @returns {number} 相似度 (0-1之间)
 */
export function calculateIngredientsSimilarity(ingredients1, ingredients2) {
  if (!ingredients1 && !ingredients2) return 1;
  if (!ingredients1 || !ingredients2) return 0;
  
  const main1 = extractMainIngredients(ingredients1);
  const main2 = extractMainIngredients(ingredients2);
  
  if (main1.length === 0 && main2.length === 0) return 1;
  if (main1.length === 0 || main2.length === 0) return 0;
  
  // 计算主要成分的匹配度
  let matchCount = 0;
  const totalCount = Math.max(main1.length, main2.length);
  
  for (const ingredient1 of main1) {
    for (const ingredient2 of main2) {
      const similarity = calculateSimilarity(ingredient1, ingredient2);
      if (similarity > 0.8) { // 高相似度认为是同一成分
        matchCount++;
        break;
      }
    }
  }
  
  return matchCount / totalCount;
}

/**
 * 记录相似度计算的详细信息（用于调试）
 * @param {string} str1 - 第一个字符串
 * @param {string} str2 - 第二个字符串
 * @param {string} type - 比较类型
 * @returns {Object} 详细的相似度信息
 */
export function getSimilarityDetails(str1, str2, type = 'general') {
  const processed1 = preprocessString(str1);
  const processed2 = preprocessString(str2);
  const similarity = calculateSimilarity(str1, str2);
  const containment = checkStringContainment(str1, str2);
  const distance = levenshteinDistance(processed1, processed2);
  
  const details = {
    original1: str1,
    original2: str2,
    processed1: processed1,
    processed2: processed2,
    similarity: similarity,
    containment: containment,
    editDistance: distance,
    type: type
  };
  
  logger.info(`相似度计算详情 [${type}]: ${str1} vs ${str2} = ${similarity.toFixed(3)}`);
  
  return details;
} 