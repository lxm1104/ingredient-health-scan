import { logger } from '../config/database.js';
import { getDBStatus } from '../config/database.js';
import mongoose from 'mongoose';
import {
  calculateSimilarity,
  calculateIngredientsSimilarity,
  getSimilarityDetails,
  checkStringContainment
} from '../utils/stringUtils.js';
import { simplifyProductType } from './productTypeService.js';

/**
 * 产品去重服务
 * 实现多层级相似度匹配算法，用于检测和处理重复产品
 */

/**
 * 去重配置
 */
const DEDUPLICATION_CONFIG = {
  // 相似度权重配置
  weights: {
    brand: 0.30,        // 品牌相似度权重 30%
    name: 0.40,         // 产品名称相似度权重 40%
    type: 0.20,         // 产品类型匹配权重 20%
    ingredients: 0.10   // 配料相似度权重 10%
  },
  
  // 相似度阈值
  thresholds: {
    overall: 0.85,      // 总体相似度阈值 85%
    high: 0.90,         // 高度疑似阈值 90%
    brandName: 0.90,    // 品牌+名称组合阈值 90%
    exactMatch: 1.0     // 完全匹配阈值 100%
  },
  
  // 其他配置
  maxCandidates: 50,    // 最大候选产品数量
  enableLogging: true   // 是否启用详细日志
};

/**
 * 计算两个产品的综合相似度
 * @param {Object} product1 - 第一个产品对象
 * @param {Object} product2 - 第二个产品对象  
 * @param {Object} ingredients1 - 第一个产品的配料信息
 * @param {Object} ingredients2 - 第二个产品的配料信息
 * @returns {Object} 相似度计算结果
 */
export function calculateProductSimilarity(product1, product2, ingredients1 = null, ingredients2 = null) {
  const result = {
    brandSimilarity: 0,
    nameSimilarity: 0,
    typeMatch: 0,
    ingredientsSimilarity: 0,
    overallSimilarity: 0,
    details: {},
    isDuplicate: false,
    confidence: 'low'
  };
  
  try {
    // 1. 计算品牌相似度
    result.brandSimilarity = calculateSimilarity(product1.brand || '', product2.brand || '');
    
    // 2. 计算产品名称相似度
    result.nameSimilarity = calculateSimilarity(product1.name || '', product2.name || '');
    
    // 3. 计算产品类型匹配度
    const type1 = simplifyProductType(product1.productType || '');
    const type2 = simplifyProductType(product2.productType || '');
    result.typeMatch = type1 === type2 ? 1.0 : 0.0;
    
    // 4. 计算配料相似度（如果有配料信息）
    if (ingredients1?.ingredientsList && ingredients2?.ingredientsList) {
      result.ingredientsSimilarity = calculateIngredientsSimilarity(
        ingredients1.ingredientsList,
        ingredients2.ingredientsList
      );
    }
    
    // 5. 计算综合相似度
    const weights = DEDUPLICATION_CONFIG.weights;
    result.overallSimilarity = 
      result.brandSimilarity * weights.brand +
      result.nameSimilarity * weights.name +
      result.typeMatch * weights.type +
      result.ingredientsSimilarity * weights.ingredients;
    
    // 6. 判断是否为重复产品
    const thresholds = DEDUPLICATION_CONFIG.thresholds;
    
    if (result.overallSimilarity >= thresholds.exactMatch) {
      result.isDuplicate = true;
      result.confidence = 'exact';
    } else if (result.overallSimilarity >= thresholds.high) {
      result.isDuplicate = true;
      result.confidence = 'high';
    } else if (result.overallSimilarity >= thresholds.overall) {
      result.isDuplicate = true;
      result.confidence = 'medium';
    }
    
    // 特殊规则：品牌+名称高度相似
    const brandNameSimilarity = (result.brandSimilarity + result.nameSimilarity) / 2;
    if (brandNameSimilarity >= thresholds.brandName && result.typeMatch === 1.0) {
      result.isDuplicate = true;
      // 只有当当前置信度更低时才更新
      if (result.confidence === 'low' || result.confidence === 'medium') {
        result.confidence = 'high';
      }
    }
    
    // 记录详细信息
    result.details = {
      product1: {
        id: product1._id?.toString(),
        brand: product1.brand,
        name: product1.name,
        type: product1.productType
      },
      product2: {
        id: product2._id?.toString(),
        brand: product2.brand,
        name: product2.name,
        type: product2.productType
      },
      calculations: {
        brandSimilarity: result.brandSimilarity,
        nameSimilarity: result.nameSimilarity,
        typeMatch: result.typeMatch,
        ingredientsSimilarity: result.ingredientsSimilarity,
        overallSimilarity: result.overallSimilarity
      },
      thresholdUsed: thresholds.overall
    };
    
    // 记录日志
    if (DEDUPLICATION_CONFIG.enableLogging && result.overallSimilarity > 0.5) {
      logger.info(`产品相似度分析: "${product1.name}" vs "${product2.name}" = ${result.overallSimilarity.toFixed(3)} (${result.isDuplicate ? '重复' : '不重复'})`);
    }
    
  } catch (error) {
    logger.error(`计算产品相似度时出错: ${error.message}`);
    result.error = error.message;
  }
  
  return result;
}

/**
 * 查找可能的重复产品
 * @param {Object} newProduct - 新产品对象
 * @param {Object} newIngredients - 新产品的配料信息（可选）
 * @returns {Promise<Array>} 可能重复的产品列表
 */
export async function findPossibleDuplicates(newProduct, newIngredients = null) {
  try {
    logger.info(`开始查找产品 "${newProduct.name}" 的可能重复项`);
    
    const { usingMemoryDB, inMemoryDB } = getDBStatus();
    let allProducts = [];
    let allIngredients = [];
    
    // 获取所有现有产品
    if (usingMemoryDB) {
      allProducts = [...inMemoryDB.products];
      allIngredients = [...inMemoryDB.ingredients];
    } else {
      allProducts = await mongoose.model('Product').find({}).lean();
      allIngredients = await mongoose.model('Ingredient').find({}).lean();
    }
    
    logger.info(`找到 ${allProducts.length} 个现有产品进行比较`);
    
    const duplicates = [];
    const candidateCount = Math.min(allProducts.length, DEDUPLICATION_CONFIG.maxCandidates);
    
    // 遍历现有产品进行比较
    for (let i = 0; i < candidateCount; i++) {
      const existingProduct = allProducts[i];
      
      // 跳过自己（如果是更新操作）
      if (newProduct._id && existingProduct._id.toString() === newProduct._id.toString()) {
        continue;
      }
      
      // 查找对应的配料信息
      const existingIngredients = allIngredients.find(ing => 
        ing.productId.toString() === existingProduct._id.toString()
      );
      
      // 计算相似度
      const similarity = calculateProductSimilarity(
        newProduct, 
        existingProduct, 
        newIngredients, 
        existingIngredients
      );
      
      // 如果是重复产品，添加到结果中
      if (similarity.isDuplicate) {
        duplicates.push({
          product: existingProduct,
          ingredients: existingIngredients,
          similarity: similarity
        });
      }
    }
    
    // 按相似度排序
    duplicates.sort((a, b) => b.similarity.overallSimilarity - a.similarity.overallSimilarity);
    
    logger.info(`找到 ${duplicates.length} 个可能的重复产品`);
    
    return duplicates;
    
  } catch (error) {
    logger.error(`查找重复产品时出错: ${error.message}`);
    return [];
  }
}

/**
 * 检查产品是否为重复产品
 * @param {Object} newProduct - 新产品对象
 * @param {Object} newIngredients - 新产品的配料信息（可选）
 * @returns {Promise<Object>} 检查结果
 */
export async function checkProductDuplication(newProduct, newIngredients = null) {
  try {
    const duplicates = await findPossibleDuplicates(newProduct, newIngredients);
    
    const result = {
      isDuplicate: duplicates.length > 0,
      duplicateCount: duplicates.length,
      bestMatch: duplicates.length > 0 ? duplicates[0] : null,
      allMatches: duplicates,
      recommendation: 'proceed' // proceed, merge, skip
    };
    
    if (duplicates.length > 0) {
      const bestMatch = duplicates[0];
      const confidence = bestMatch.similarity.confidence;
      
      // 根据置信度给出建议
      if (confidence === 'exact' || confidence === 'high') {
        result.recommendation = 'skip';
        result.message = `发现高度相似的产品："${bestMatch.product.name}"，建议跳过添加`;
      } else if (confidence === 'medium') {
        result.recommendation = 'merge';
        result.message = `发现相似产品："${bestMatch.product.name}"，建议确认是否为同一产品`;
      } else {
        result.recommendation = 'proceed';
        result.message = '发现疑似相似产品，但相似度较低，可以继续添加';
      }
      
      logger.info(`重复检查结果: ${newProduct.name} - ${result.message}`);
    } else {
      result.message = '未发现重复产品，可以安全添加';
      logger.info(`重复检查结果: ${newProduct.name} - 未发现重复`);
    }
    
    return result;
    
  } catch (error) {
    logger.error(`检查产品重复时出错: ${error.message}`);
    return {
      isDuplicate: false,
      error: error.message,
      recommendation: 'proceed',
      message: '检查重复时出错，建议手动确认'
    };
  }
}

/**
 * 合并重复产品的信息
 * @param {Object} originalProduct - 原始产品
 * @param {Object} duplicateProduct - 重复产品
 * @param {Object} originalIngredients - 原始产品配料
 * @param {Object} duplicateIngredients - 重复产品配料
 * @returns {Object} 合并后的产品信息
 */
export function mergeProductInformation(originalProduct, duplicateProduct, originalIngredients = null, duplicateIngredients = null) {
  const merged = {
    product: { ...originalProduct },
    ingredients: originalIngredients ? { ...originalIngredients } : null,
    changes: []
  };
  
  try {
    // 合并产品信息：选择更完整、更准确的信息
    
    // 品牌信息合并
    if ((!originalProduct.brand || originalProduct.brand === '未知品牌') && 
        duplicateProduct.brand && duplicateProduct.brand !== '未知品牌') {
      merged.product.brand = duplicateProduct.brand;
      merged.changes.push(`更新品牌: ${originalProduct.brand} -> ${duplicateProduct.brand}`);
    }
    
    // 产品名称合并（选择更详细的）
    if (duplicateProduct.name && duplicateProduct.name.length > originalProduct.name.length) {
      merged.product.name = duplicateProduct.name;
      merged.changes.push(`更新产品名: ${originalProduct.name} -> ${duplicateProduct.name}`);
    }
    
    // 产品类型合并（选择更具体的）
    const originalTypeSimplified = simplifyProductType(originalProduct.productType);
    const duplicateTypeSimplified = simplifyProductType(duplicateProduct.productType);
    if (duplicateTypeSimplified !== '其他' && originalTypeSimplified === '其他') {
      merged.product.productType = duplicateProduct.productType;
      merged.changes.push(`更新产品类型: ${originalProduct.productType} -> ${duplicateProduct.productType}`);
    }
    
    // 图片URL合并（如果原图片不可用）
    if (!originalProduct.imageUrl || originalProduct.imageUrl.includes('placeholder')) {
      if (duplicateProduct.imageUrl && !duplicateProduct.imageUrl.includes('placeholder')) {
        merged.product.imageUrl = duplicateProduct.imageUrl;
        merged.changes.push(`更新图片URL`);
      }
    }
    
    // 配料信息合并
    if (merged.ingredients && duplicateIngredients) {
      // 选择更详细的配料表
      if (duplicateIngredients.ingredientsList && 
          duplicateIngredients.ingredientsList.length > merged.ingredients.ingredientsList.length) {
        merged.ingredients.ingredientsList = duplicateIngredients.ingredientsList;
        merged.changes.push(`更新配料表（更详细）`);
      }
      
      // 合并配料数组（去重）
      if (duplicateIngredients.ingredients && duplicateIngredients.ingredients.length > 0) {
        const existingNames = new Set(merged.ingredients.ingredients.map(ing => ing.name));
        const newIngredients = duplicateIngredients.ingredients.filter(ing => !existingNames.has(ing.name));
        if (newIngredients.length > 0) {
          merged.ingredients.ingredients.push(...newIngredients);
          merged.changes.push(`添加了 ${newIngredients.length} 个新配料项`);
        }
      }
      
      // 保留更好的健康评分
      if (duplicateIngredients.healthScore && 
          (!merged.ingredients.healthScore || duplicateIngredients.healthScore > merged.ingredients.healthScore)) {
        merged.ingredients.healthScore = duplicateIngredients.healthScore;
        merged.ingredients.healthLevel = duplicateIngredients.healthLevel;
        merged.ingredients.healthAnalysis = duplicateIngredients.healthAnalysis;
        merged.changes.push(`更新健康评分: ${duplicateIngredients.healthScore}分`);
      }
    }
    
    // 更新时间
    merged.product.updatedAt = new Date();
    if (merged.ingredients) {
      merged.ingredients.updatedAt = new Date();
    }
    
    logger.info(`合并产品信息完成: ${merged.changes.length} 项更改`);
    
  } catch (error) {
    logger.error(`合并产品信息时出错: ${error.message}`);
    merged.error = error.message;
  }
  
  return merged;
}

/**
 * 执行产品去重操作
 * @param {Object} options - 去重选项
 * @returns {Promise<Object>} 去重结果
 */
export async function performDeduplication(options = {}) {
  const {
    dryRun = true,           // 是否为试运行（不实际删除数据）
    threshold = null,        // 自定义相似度阈值
    maxProcessed = 100,      // 最大处理数量
    saveBackup = true        // 是否保存备份
  } = options;
  
  const result = {
    processed: 0,
    duplicatesFound: 0,
    duplicatesRemoved: 0,
    errors: [],
    operations: [],
    backup: null
  };
  
  try {
    logger.info(`开始批量去重操作 (${dryRun ? '试运行' : '实际执行'})`);
    
    const { usingMemoryDB, inMemoryDB } = getDBStatus();
    let allProducts = [];
    
    // 获取所有产品
    if (usingMemoryDB) {
      allProducts = [...inMemoryDB.products];
    } else {
      allProducts = await mongoose.model('Product').find({}).lean();
    }
    
    logger.info(`找到 ${allProducts.length} 个产品待处理`);
    
    // 处理数量限制
    const productsToProcess = allProducts.slice(0, maxProcessed);
    const duplicateGroups = new Map(); // 存储重复组
    const processedIds = new Set();    // 已处理的产品ID
    
    // 查找重复组
    for (let i = 0; i < productsToProcess.length; i++) {
      const product1 = productsToProcess[i];
      const id1 = product1._id.toString();
      
      if (processedIds.has(id1)) continue;
      
      const duplicates = [product1]; // 包含自己的重复组
      
      for (let j = i + 1; j < productsToProcess.length; j++) {
        const product2 = productsToProcess[j];
        const id2 = product2._id.toString();
        
        if (processedIds.has(id2)) continue;
        
        // 计算相似度
        const similarity = calculateProductSimilarity(product1, product2);
        const customThreshold = threshold || DEDUPLICATION_CONFIG.thresholds.overall;
        
        if (similarity.overallSimilarity >= customThreshold) {
          duplicates.push(product2);
          processedIds.add(id2);
          result.duplicatesFound++;
        }
      }
      
      if (duplicates.length > 1) {
        // 找到重复组，按创建时间排序（保留最早的）
        duplicates.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        duplicateGroups.set(id1, duplicates);
      }
      
      processedIds.add(id1);
      result.processed++;
    }
    
    logger.info(`找到 ${duplicateGroups.size} 个重复组，共 ${result.duplicatesFound} 个重复产品`);
    
    // 执行去重操作
    if (!dryRun && duplicateGroups.size > 0) {
      for (const [masterIdString, duplicates] of duplicateGroups) {
        const masterProduct = duplicates[0]; // 保留的主产品
        const duplicatesToRemove = duplicates.slice(1); // 要删除的重复产品
        
        for (const duplicate of duplicatesToRemove) {
          try {
            if (usingMemoryDB) {
              // 内存数据库删除
              const productIndex = inMemoryDB.products.findIndex(p => p._id === duplicate._id);
              if (productIndex !== -1) {
                inMemoryDB.products.splice(productIndex, 1);
              }
              
              const ingredientIndex = inMemoryDB.ingredients.findIndex(ing => ing.productId === duplicate._id);
              if (ingredientIndex !== -1) {
                inMemoryDB.ingredients.splice(ingredientIndex, 1);
              }
            } else {
              // MongoDB删除
              await mongoose.model('Product').deleteOne({ _id: duplicate._id });
              await mongoose.model('Ingredient').deleteMany({ productId: duplicate._id });
            }
            
            result.duplicatesRemoved++;
            result.operations.push({
              type: 'remove',
              duplicateId: duplicate._id.toString(),
              duplicateName: duplicate.name,
              masterId: masterProduct._id.toString(),
              masterName: masterProduct.name
            });
            
            logger.info(`删除重复产品: ${duplicate.name} (ID: ${duplicate._id})`);
            
          } catch (error) {
            result.errors.push({
              productId: duplicate._id.toString(),
              productName: duplicate.name,
              error: error.message
            });
            logger.error(`删除重复产品失败: ${duplicate.name} - ${error.message}`);
          }
        }
      }
    }
    
    result.summary = {
      totalProducts: allProducts.length,
      processedProducts: result.processed,
      duplicateGroups: duplicateGroups.size,
      duplicatesFound: result.duplicatesFound,
      duplicatesRemoved: result.duplicatesRemoved,
      errors: result.errors.length,
      estimatedReduction: `${((result.duplicatesFound / allProducts.length) * 100).toFixed(1)}%`
    };
    
    logger.info(`去重操作完成: ${JSON.stringify(result.summary)}`);
    
  } catch (error) {
    logger.error(`批量去重操作失败: ${error.message}`);
    result.error = error.message;
  }
  
  return result;
}

/**
 * 获取去重统计信息
 * @returns {Promise<Object>} 统计信息
 */
export async function getDeduplicationStats() {
  try {
    const { usingMemoryDB, inMemoryDB } = getDBStatus();
    let allProducts = [];
    
    if (usingMemoryDB) {
      allProducts = [...inMemoryDB.products];
    } else {
      allProducts = await mongoose.model('Product').find({}).lean();
    }
    
    const stats = {
      totalProducts: allProducts.length,
      potentialDuplicates: 0,
      duplicateGroups: 0,
      estimatedReduction: 0,
      topDuplicates: []
    };
    
    // 快速扫描前50个产品寻找重复
    const sampleSize = Math.min(50, allProducts.length);
    const duplicateGroups = new Map();
    
    for (let i = 0; i < sampleSize; i++) {
      for (let j = i + 1; j < sampleSize; j++) {
        const similarity = calculateProductSimilarity(allProducts[i], allProducts[j]);
        
        if (similarity.isDuplicate) {
          const key = `${allProducts[i]._id}-${allProducts[j]._id}`;
          duplicateGroups.set(key, {
            product1: allProducts[i],
            product2: allProducts[j],
            similarity: similarity.overallSimilarity
          });
          stats.potentialDuplicates++;
        }
      }
    }
    
    stats.duplicateGroups = duplicateGroups.size;
    stats.estimatedReduction = (stats.potentialDuplicates / allProducts.length * 100).toFixed(1);
    
    // 获取相似度最高的前5个重复组
    stats.topDuplicates = Array.from(duplicateGroups.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(group => ({
        product1Name: group.product1.name,
        product2Name: group.product2.name,
        similarity: group.similarity.toFixed(3)
      }));
    
    return stats;
    
  } catch (error) {
    logger.error(`获取去重统计信息失败: ${error.message}`);
    return { error: error.message };
  }
} 