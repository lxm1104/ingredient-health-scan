import Product from '../models/Product.js';
import { logger } from '../config/database.js';
import { getDBStatus } from '../config/database.js';
import mongoose from 'mongoose';

/**
 * 生成健康评分假数据（备用方案）
 * @param {string} productName - 产品名称，用于生成一致的评分
 * @returns {number} 60-95之间的健康评分
 */
function generateHealthScore(productName) {
  // 使用产品名称作为随机种子，确保同一产品始终有相同的评分
  let hash = 0;
  for (let i = 0; i < productName.length; i++) {
    const char = productName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  // 将hash值转换为60-95范围内的评分
  const score = 60 + Math.abs(hash) % 36;
  return score;
}

/**
 * 从ingredients集合中获取产品的真实健康评分
 * @param {string} productId - 产品ID
 * @param {string} productName - 产品名称
 * @returns {Promise<Object>} 健康评分信息
 */
async function getProductHealthScore(productId, productName) {
  try {
    const { usingMemoryDB, inMemoryDB } = getDBStatus();
    
    if (usingMemoryDB) {
      // 从内存数据库查找
      const ingredient = inMemoryDB.ingredients.find(ing => 
        ing.productId === productId || ing.productName === productName
      );
      
      if (ingredient && ingredient.healthScore) {
        return {
          healthScore: ingredient.healthScore,
          healthLevel: ingredient.healthLevel,
          healthAnalysis: ingredient.healthAnalysis
        };
      }
    } else {
      // 从MongoDB查找 - 只使用productId查询
      const IngredientModel = mongoose.model('Ingredient');
      const ingredient = await IngredientModel.findOne({
        productId: new mongoose.Types.ObjectId(productId)
      }).sort({ scoreAnalyzedAt: -1 }); // 获取最新的评分
      
      if (ingredient && ingredient.healthScore) {
        logger.info(`找到产品 ${productName} 的真实健康评分: ${ingredient.healthScore}`);
        return {
          healthScore: ingredient.healthScore,
          healthLevel: ingredient.healthLevel,
          healthAnalysis: ingredient.healthAnalysis
        };
      }
    }
    
    // 如果没有找到真实评分，使用备用算法
    logger.warn(`未找到产品 ${productName} 的健康评分，使用备用算法`);
    const fallbackScore = generateHealthScore(productName);
    return {
      healthScore: fallbackScore,
      healthLevel: fallbackScore >= 80 ? '良好' : fallbackScore >= 70 ? '一般' : '较差',
      healthAnalysis: '基于算法生成的健康评分（未进行AI分析）'
    };
    
  } catch (error) {
    logger.error(`获取健康评分失败: ${error.message}`);
    // 发生错误时使用备用算法
    const fallbackScore = generateHealthScore(productName);
    return {
      healthScore: fallbackScore,
      healthLevel: fallbackScore >= 80 ? '良好' : fallbackScore >= 70 ? '一般' : '较差',
      healthAnalysis: '获取健康评分时出错，使用备用评分'
    };
  }
}

/**
 * 获取所有产品类型（去重）
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @returns {Promise<void>}
 */
async function getProductCategories(req, res) {
  try {
    logger.info('开始获取产品类型列表');
    
    const { usingMemoryDB, inMemoryDB } = getDBStatus();
    let categories = [];
    
    if (usingMemoryDB) {
      // 从内存数据库获取去重的产品类型
      logger.info('从内存数据库获取产品类型');
      const productTypes = inMemoryDB.products.map(product => product.productType);
      categories = [...new Set(productTypes)].filter(type => type); // 去重并过滤空值
      logger.info(`内存数据库中找到 ${categories.length} 个产品类型`);
    } else {
      // 从MongoDB获取去重的产品类型
      logger.info('从MongoDB获取产品类型');
      categories = await mongoose.model('Product').distinct('productType');
      logger.info(`MongoDB中找到 ${categories.length} 个产品类型`);
    }
    
    // 在数组开头添加"全部"选项
    const result = ['全部', ...categories];
    
    logger.info(`返回产品类型列表: ${result.join(', ')}`);
    res.status(200).json({
      success: true,
      data: {
        categories: result
      }
    });
    
  } catch (error) {
    logger.error(`获取产品类型失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '获取产品类型失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 获取推荐产品列表
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @returns {Promise<void>}
 */
async function getRecommendedProducts(req, res) {
  try {
    const { category = '全部', sortBy = 'healthScore', limit = 50 } = req.query;
    
    logger.info(`获取推荐产品: 类别=${category}, 排序=${sortBy}, 限制=${limit}`);
    
    const { usingMemoryDB, inMemoryDB } = getDBStatus();
    let products = [];
    
    if (usingMemoryDB) {
      // 从内存数据库获取产品
      logger.info('从内存数据库获取产品列表');
      products = [...inMemoryDB.products];
      logger.info(`内存数据库中找到 ${products.length} 个产品`);
    } else {
      // 从MongoDB获取产品
      logger.info('从MongoDB获取产品列表');
      const ProductModel = mongoose.model('Product');
      products = await ProductModel.find({}).lean();
      logger.info(`MongoDB中找到 ${products.length} 个产品`);
    }
    
    // 按类别筛选（如果不是"全部"）
    if (category !== '全部') {
      products = products.filter(product => product.productType === category);
      logger.info(`按类别 "${category}" 筛选后剩余 ${products.length} 个产品`);
    }
    
    // 为每个产品获取真实的健康评分
    const productsWithScores = await Promise.all(products.map(async (product) => {
      // 获取真实的健康评分
      const healthInfo = await getProductHealthScore(product._id, product.name);
      
      // 生成推荐描述
      let description = '';
      const healthScore = healthInfo.healthScore;
      if (healthScore >= 90) {
        description = `${product.name}是一款优质健康产品，成分天然，营养丰富，强烈推荐。`;
      } else if (healthScore >= 80) {
        description = `${product.name}整体健康水平良好，适合日常消费，推荐适量食用。`;
      } else if (healthScore >= 70) {
        description = `${product.name}营养成分一般，建议适量食用，注意均衡饮食。`;
      } else {
        description = `${product.name}建议谨慎选择，可以考虑寻找更健康的替代品。`;
      }
      
      return {
        id: product._id,
        name: product.name,
        brand: product.brand,
        category: product.productType,
        image: product.imageUrl,
        healthScore: healthInfo.healthScore,
        healthLevel: healthInfo.healthLevel,
        description
      };
    }));
    
    // 按健康评分排序（默认从高到低）
    if (sortBy === 'healthScore') {
      productsWithScores.sort((a, b) => b.healthScore - a.healthScore);
    }
    
    // 限制返回数量
    const limitedProducts = productsWithScores.slice(0, parseInt(limit));
    
    logger.info(`返回 ${limitedProducts.length} 个推荐产品`);
    
    res.status(200).json({
      success: true,
      data: {
        products: limitedProducts,
        total: productsWithScores.length,
        category,
        sortBy
      }
    });
    
  } catch (error) {
    logger.error(`获取推荐产品失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '获取推荐产品失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export { getProductCategories, getRecommendedProducts }; 