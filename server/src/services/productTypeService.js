import { logger } from '../config/database.js';

/**
 * 产品类型映射规则
 * 将复杂的技术性产品类型简化为用户友好的日常描述
 */
const productTypeMapping = {
  // 饼干类
  '烘烤类糕点': '饼干',
  '糕点/饼干': '饼干',
  '烘焙食品': '饼干',
  '糕点': '饼干',
  '饼干': '饼干',
  
  // 方便食品类
  '热风干燥方便食品': '方便面',
  '方便面': '方便面',
  '油炸型方便面': '方便面',
  '非油炸方便面': '方便面',
  '冷面': '方便面',
  
  // 速冻食品类
  '速冻水饺': '速冻饺子',
  '速冻包子': '速冻饺子',
  '速冻馄饨': '速冻饺子',
  '速冻食品': '速冻饺子',
  '冷冻食品': '速冻饺子',
  
  // 调味品类
  '高盐稀态发酵酱油': '酱油',
  '生抽': '酱油',
  '老抽': '酱油',
  '酱油': '酱油',
  '食醋': '醋',
  '陈醋': '醋',
  '白醋': '醋',
  '米醋': '醋',
  '醋': '醋',
  '调味品': '调味品',
  '调料': '调味品',
  
  // 膨化食品类
  '膨化食品': '膨化食品',
  '薯片': '膨化食品',
  '爆米花': '膨化食品',
  '虾条': '膨化食品',
  
  // 饮料类
  '饮料': '饮料',
  '碳酸饮料': '饮料',
  '果汁饮料': '饮料',
  '茶饮料': '饮料',
  '咖啡饮料': '饮料',
  '功能饮料': '饮料',
  '运动饮料': '饮料',
  
  // 豆制品类
  '(Ⅱ类·其他型)速溶豆粉': '豆制品',
  '豆浆粉': '豆制品',
  '豆腐': '豆制品',
  '豆干': '豆制品',
  '豆制品': '豆制品',
  
  // 奶制品类
  '牛奶': '奶制品',
  '酸奶': '奶制品',
  '奶粉': '奶制品',
  '乳制品': '奶制品',
  '奶制品': '奶制品',
  
  // 肉制品类
  '火腿肠': '肉制品',
  '香肠': '肉制品',
  '培根': '肉制品',
  '肉类制品': '肉制品',
  '肉制品': '肉制品',
  
  // 坚果类
  '坚果': '坚果',
  '花生': '坚果',
  '瓜子': '坚果',
  '核桃': '坚果',
  '杏仁': '坚果',
  
  // 糖果类
  '糖果': '糖果',
  '巧克力': '糖果',
  '口香糖': '糖果',
  '软糖': '糖果',
  '硬糖': '糖果',
  
  // 罐头类
  '罐头': '罐头',
  '水果罐头': '罐头',
  '肉类罐头': '罐头',
  '蔬菜罐头': '罐头',
  
  // 其他
  '未知类型': '其他',
  '其他': '其他'
};

/**
 * 获取所有简化后的产品类型列表
 * @returns {Array<string>} 简化后的产品类型列表
 */
export function getSimplifiedProductTypes() {
  const uniqueTypes = [...new Set(Object.values(productTypeMapping))];
  return uniqueTypes.sort();
}

/**
 * 将原始产品类型转换为简化类型
 * @param {string} originalType - 原始产品类型
 * @returns {string} 简化后的产品类型
 */
export function simplifyProductType(originalType) {
  if (!originalType || typeof originalType !== 'string') {
    logger.warn(`无效的产品类型: ${originalType}`);
    return '其他';
  }
  
  const trimmedType = originalType.trim();
  
  // 直接匹配
  if (productTypeMapping[trimmedType]) {
    return productTypeMapping[trimmedType];
  }
  
  // 模糊匹配 - 检查是否包含关键词
  for (const [key, value] of Object.entries(productTypeMapping)) {
    if (trimmedType.includes(key) || key.includes(trimmedType)) {
      logger.info(`模糊匹配: "${trimmedType}" -> "${value}" (通过关键词: "${key}")`);
      return value;
    }
  }
  
  // 特殊规则匹配
  const lowerType = trimmedType.toLowerCase();
  
  // 包含饼干、糕点相关关键词
  if (lowerType.includes('饼干') || lowerType.includes('糕点') || lowerType.includes('烘焙')) {
    return '饼干';
  }
  
  // 包含方便面相关关键词
  if (lowerType.includes('方便面') || lowerType.includes('面条') || lowerType.includes('拉面')) {
    return '方便面';
  }
  
  // 包含饮料相关关键词
  if (lowerType.includes('饮料') || lowerType.includes('汽水') || lowerType.includes('果汁')) {
    return '饮料';
  }
  
  // 包含调味品相关关键词
  if (lowerType.includes('酱油') || lowerType.includes('醋') || lowerType.includes('调料')) {
    if (lowerType.includes('酱油')) return '酱油';
    if (lowerType.includes('醋')) return '醋';
    return '调味品';
  }
  
  // 如果没有匹配到，记录并返回其他
  logger.warn(`未匹配的产品类型: "${trimmedType}" -> "其他"`);
  return '其他';
}

/**
 * 批量转换产品类型
 * @param {Array} products - 产品列表
 * @returns {Array} 转换后的产品列表
 */
export function simplifyProductTypes(products) {
  if (!Array.isArray(products)) {
    logger.error('产品列表必须是数组');
    return [];
  }
  
  return products.map(product => {
    if (!product || typeof product !== 'object') {
      logger.warn('无效的产品对象');
      return product;
    }
    
    const originalType = product.productType;
    const simplifiedType = simplifyProductType(originalType);
    
    if (originalType !== simplifiedType) {
      logger.info(`产品类型转换: "${originalType}" -> "${simplifiedType}"`);
    }
    
    return {
      ...product,
      productType: simplifiedType,
      originalProductType: originalType // 保留原始类型作为备份
    };
  });
}

/**
 * 获取产品类型转换统计信息
 * @param {Array} products - 产品列表
 * @returns {Object} 转换统计信息
 */
export function getProductTypeStats(products) {
  if (!Array.isArray(products)) {
    return { error: '产品列表必须是数组' };
  }
  
  const originalTypes = {};
  const simplifiedTypes = {};
  const conversions = {};
  
  products.forEach(product => {
    if (!product || !product.productType) return;
    
    const original = product.productType;
    const simplified = simplifyProductType(original);
    
    // 统计原始类型
    originalTypes[original] = (originalTypes[original] || 0) + 1;
    
    // 统计简化类型
    simplifiedTypes[simplified] = (simplifiedTypes[simplified] || 0) + 1;
    
    // 统计转换映射
    if (!conversions[original]) {
      conversions[original] = simplified;
    }
  });
  
  return {
    originalTypesCount: Object.keys(originalTypes).length,
    simplifiedTypesCount: Object.keys(simplifiedTypes).length,
    originalTypes,
    simplifiedTypes,
    conversions
  };
}

/**
 * 验证产品类型转换规则
 * @returns {Object} 验证结果
 */
export function validateProductTypeMapping() {
  const simplifiedTypes = getSimplifiedProductTypes();
  const mappingKeys = Object.keys(productTypeMapping);
  const mappingValues = Object.values(productTypeMapping);
  
  return {
    totalMappingRules: mappingKeys.length,
    uniqueSimplifiedTypes: simplifiedTypes.length,
    simplifiedTypes,
    sampleMappings: Object.fromEntries(
      Object.entries(productTypeMapping).slice(0, 10)
    )
  };
} 