import mongoose from 'mongoose';
import { connectDB, logger } from '../src/config/database.js';
import Product from '../src/models/Product.js';
import Ingredient from '../src/models/Ingredient.js';
import healthScoreService from '../src/services/healthScoreService.js';

/**
 * 更新存量数据的健康评分
 * 为所有没有健康评分的配料记录进行健康评分分析
 */
async function updateHealthScores() {
  try {
    logger.info('开始更新存量数据的健康评分...');
    
    // 连接数据库
    await connectDB();
    logger.info('数据库连接成功');
    
    // 查找所有没有健康评分的配料记录
    const ingredientsWithoutScore = await mongoose.model('Ingredient').find({
      $or: [
        { healthScore: null },
        { healthScore: { $exists: false } }
      ]
    }).populate('productId');
    
    logger.info(`找到 ${ingredientsWithoutScore.length} 条需要更新健康评分的记录`);
    
    if (ingredientsWithoutScore.length === 0) {
      logger.info('所有记录都已有健康评分，无需更新');
      return;
    }
    
    let successCount = 0;
    let failureCount = 0;
    
    // 批量处理，避免频率限制
    for (let i = 0; i < ingredientsWithoutScore.length; i++) {
      const ingredient = ingredientsWithoutScore[i];
      const product = ingredient.productId;
      
      try {
        logger.info(`处理第 ${i + 1}/${ingredientsWithoutScore.length} 条记录: ${product.name}`);
        
        // 检查必要字段
        if (!ingredient.ingredientsList || ingredient.ingredientsList.trim() === '') {
          logger.warn(`跳过记录 ${ingredient._id}: 配料表为空`);
          failureCount++;
          continue;
        }
        
        // 进行健康评分分析
        const healthScoreData = await healthScoreService.analyzeHealthScore(
          ingredient.ingredientsList,
          product.name,
          product.productType
        );
        
        // 更新数据库记录
        await mongoose.model('Ingredient').updateOne(
          { _id: ingredient._id },
          {
            $set: {
              healthScore: healthScoreData.healthScore,
              healthLevel: healthScoreData.healthLevel,
              healthAnalysis: healthScoreData.analysis,
              mainIssues: healthScoreData.mainIssues || [],
              goodPoints: healthScoreData.goodPoints || [],
              scoreAnalyzedAt: new Date()
            }
          }
        );
        
        logger.info(`更新成功: ${product.name} - 健康评分: ${healthScoreData.healthScore}分`);
        successCount++;
        
        // 添加延迟，避免API频率限制
        if (i < ingredientsWithoutScore.length - 1) {
          logger.info('等待2秒以避免API频率限制...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        logger.error(`处理记录 ${ingredient._id} 失败: ${error.message}`);
        failureCount++;
        
        // 如果是API错误，等待更长时间
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          logger.warn('遇到API频率限制，等待10秒...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }
    
    logger.info(`健康评分更新完成! 成功: ${successCount} 条，失败: ${failureCount} 条`);
    
    // 显示更新结果统计
    await showUpdateStatistics();
    
  } catch (error) {
    logger.error(`更新健康评分失败: ${error.message}`);
    throw error;
  }
}

/**
 * 显示更新结果统计
 */
async function showUpdateStatistics() {
  try {
    const totalIngredients = await mongoose.model('Ingredient').countDocuments();
    const withScore = await mongoose.model('Ingredient').countDocuments({
      healthScore: { $exists: true, $ne: null }
    });
    const withoutScore = totalIngredients - withScore;
    
    logger.info('=== 健康评分统计 ===');
    logger.info(`总配料记录数: ${totalIngredients}`);
    logger.info(`已有健康评分: ${withScore}`);
    logger.info(`缺少健康评分: ${withoutScore}`);
    
    if (withScore > 0) {
      // 显示评分分布
      const scoreDistribution = await mongoose.model('Ingredient').aggregate([
        { $match: { healthScore: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$healthLevel',
            count: { $sum: 1 },
            avgScore: { $avg: '$healthScore' },
            minScore: { $min: '$healthScore' },
            maxScore: { $max: '$healthScore' }
          }
        },
        { $sort: { avgScore: -1 } }
      ]);
      
      logger.info('=== 健康评分分布 ===');
      scoreDistribution.forEach(dist => {
        logger.info(`${dist._id}: ${dist.count}条 (平均${dist.avgScore.toFixed(1)}分, 范围${dist.minScore}-${dist.maxScore}分)`);
      });
    }
    
  } catch (error) {
    logger.error(`显示统计信息失败: ${error.message}`);
  }
}

/**
 * 重新分析指定产品的健康评分（用于测试或重新评估）
 * @param {string} productName - 产品名称（支持模糊匹配）
 */
async function reanalyzeProduct(productName) {
  try {
    logger.info(`重新分析产品健康评分: ${productName}`);
    
    await connectDB();
    
    // 查找匹配的产品
    const products = await mongoose.model('Product').find({
      name: { $regex: productName, $options: 'i' }
    });
    
    if (products.length === 0) {
      logger.warn(`未找到匹配的产品: ${productName}`);
      return;
    }
    
    logger.info(`找到 ${products.length} 个匹配的产品`);
    
    for (const product of products) {
      const ingredient = await mongoose.model('Ingredient').findOne({
        productId: product._id
      });
      
      if (!ingredient) {
        logger.warn(`产品 ${product.name} 没有配料信息`);
        continue;
      }
      
      try {
        const healthScoreData = await healthScoreService.analyzeHealthScore(
          ingredient.ingredientsList,
          product.name,
          product.productType
        );
        
        await mongoose.model('Ingredient').updateOne(
          { _id: ingredient._id },
          {
            $set: {
              healthScore: healthScoreData.healthScore,
              healthLevel: healthScoreData.healthLevel,
              healthAnalysis: healthScoreData.analysis,
              mainIssues: healthScoreData.mainIssues || [],
              goodPoints: healthScoreData.goodPoints || [],
              scoreAnalyzedAt: new Date()
            }
          }
        );
        
        logger.info(`重新分析完成: ${product.name} - 健康评分: ${healthScoreData.healthScore}分 (${healthScoreData.healthLevel})`);
        
      } catch (error) {
        logger.error(`重新分析产品 ${product.name} 失败: ${error.message}`);
      }
    }
    
  } catch (error) {
    logger.error(`重新分析失败: ${error.message}`);
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  try {
    if (command === 'reanalyze' && args[1]) {
      // 重新分析指定产品
      await reanalyzeProduct(args[1]);
    } else {
      // 默认更新所有缺少健康评分的记录
      await updateHealthScores();
    }
  } catch (error) {
    logger.error(`脚本执行失败: ${error.message}`);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    logger.info('数据库连接已关闭');
    process.exit(0);
  }
}

// 执行脚本
main();

// 导出函数供其他模块使用
export { updateHealthScores, reanalyzeProduct, showUpdateStatistics }; 