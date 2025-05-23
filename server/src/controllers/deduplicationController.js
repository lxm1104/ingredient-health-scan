import { logger } from '../config/database.js';
import { 
  performDeduplication, 
  getDeduplicationStats,
  findPossibleDuplicates 
} from '../services/productDeduplicationService.js';

/**
 * 获取去重统计信息
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function getStatsController(req, res) {
  try {
    logger.info('获取去重统计信息');
    
    const stats = await getDeduplicationStats();
    
    if (stats.error) {
      return res.status(500).json({
        success: false,
        message: '获取统计信息失败',
        error: stats.error
      });
    }
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error(`获取去重统计信息失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: error.message
    });
  }
}

/**
 * 执行批量去重操作
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function batchDeduplicationController(req, res) {
  try {
    const { 
      dryRun = true,        // 默认为试运行
      threshold,            // 自定义阈值
      maxProcessed = 100,   // 最大处理数量
      saveBackup = true     // 是否保存备份
    } = req.body;
    
    logger.info(`开始批量去重操作: dryRun=${dryRun}, threshold=${threshold}, maxProcessed=${maxProcessed}`);
    
    const result = await performDeduplication({
      dryRun,
      threshold,
      maxProcessed,
      saveBackup
    });
    
    if (result.error) {
      return res.status(500).json({
        success: false,
        message: '批量去重操作失败',
        error: result.error
      });
    }
    
    // 根据操作类型返回不同的状态码
    const statusCode = dryRun ? 200 : (result.errors.length > 0 ? 207 : 200);
    
    res.status(statusCode).json({
      success: true,
      data: result,
      message: dryRun ? 
        `试运行完成，预计可减少${result.summary.duplicatesFound}个重复产品` :
        `去重操作完成，实际删除${result.summary.duplicatesRemoved}个重复产品`
    });
  } catch (error) {
    logger.error(`批量去重操作失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '批量去重操作失败',
      error: error.message
    });
  }
}

/**
 * 查找特定产品的可能重复项
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function findDuplicatesController(req, res) {
  try {
    const { productId } = req.params;
    const { brand, name, productType } = req.body;
    
    if (!productId && (!brand || !name)) {
      return res.status(400).json({
        success: false,
        message: '请提供产品ID或者产品的品牌和名称信息'
      });
    }
    
    let targetProduct = null;
    
    if (productId) {
      // 通过ID查找产品
      const Product = (await import('../models/Product.js')).default;
      targetProduct = await Product.findById(productId).lean();
      
      if (!targetProduct) {
        return res.status(404).json({
          success: false,
          message: '未找到指定产品'
        });
      }
    } else {
      // 使用提供的产品信息
      targetProduct = {
        brand,
        name,
        productType: productType || '未知类型'
      };
    }
    
    logger.info(`查找产品重复项: ${targetProduct.name}`);
    
    const duplicates = await findPossibleDuplicates(targetProduct);
    
    res.status(200).json({
      success: true,
      data: {
        targetProduct,
        duplicatesFound: duplicates.length,
        duplicates: duplicates.map(dup => ({
          product: {
            id: dup.product._id,
            brand: dup.product.brand,
            name: dup.product.name,
            productType: dup.product.productType
          },
          similarity: {
            overall: dup.similarity.overallSimilarity,
            confidence: dup.similarity.confidence,
            details: {
              brand: dup.similarity.brandSimilarity,
              name: dup.similarity.nameSimilarity,
              type: dup.similarity.typeMatch,
              ingredients: dup.similarity.ingredientsSimilarity
            }
          }
        }))
      }
    });
  } catch (error) {
    logger.error(`查找重复产品失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '查找重复产品失败',
      error: error.message
    });
  }
}

export { 
  getStatsController, 
  batchDeduplicationController, 
  findDuplicatesController 
}; 