import { analyzeImage, parseVlmOutput } from '../services/vlmService.js';
import Product from '../models/Product.js';
import Ingredient from '../models/Ingredient.js';
import { logger } from '../config/database.js';
import healthScoreService from '../services/healthScoreService.js';
import { checkProductDuplication, mergeProductInformation } from '../services/productDeduplicationService.js';

/**
 * 处理图片分析请求
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @returns {Promise<void>}
 */
async function analyzeImageController(req, res) {
  try {
    const { imageUrl, testMode } = req.body;
    
    // 测试模式，返回模拟数据（仅开发环境使用）
    if (testMode && process.env.NODE_ENV !== 'production') {
      logger.info('使用测试模式返回模拟数据');
      return res.status(200).json({
        success: true,
        data: {
          product: {
            id: 'test-product-id',
            brand: 'Nature\'s Own',
            name: 'Whole Grain Bread',
            productType: '面包',
            imageUrl
          },
          ingredients: {
            id: 'test-ingredient-id',
            ingredientsList: '全麦面粉, 水, 蜂蜜, 酵母, 盐, 植物油',
            ingredients: [
              { name: '全麦面粉', isHarmful: false, harmfulLevel: 0 },
              { name: '水', isHarmful: false, harmfulLevel: 0 },
              { name: '蜂蜜', isHarmful: false, harmfulLevel: 0 },
              { name: '酵母', isHarmful: false, harmfulLevel: 0 },
              { name: '盐', isHarmful: false, harmfulLevel: 0 },
              { name: '植物油', isHarmful: false, harmfulLevel: 0 }
            ],
            healthScore: 88,
            healthLevel: '良好',
            healthAnalysis: '测试模式下的健康评分'
          }
        }
      });
    }
    

    // 验证请求数据
    if (!imageUrl) {
      logger.warn('缺少图片URL参数');
      return res.status(400).json({ success: false, message: '请提供图片URL' });
    }

    // 检查URL格式
    try {
      new URL(imageUrl);
    } catch (error) {
      logger.warn(`无效的图片URL: ${imageUrl}`);
      return res.status(400).json({ success: false, message: '请提供有效的图片URL' });
    }

    logger.info(`接收到图片分析请求: ${imageUrl}`);

    // 调用VLM模型分析图片
    const vlmOutput = await analyzeImage(imageUrl);
    logger.info(`VLM模型原始输出: ${vlmOutput}`);
    
    // 解析模型输出
    const parsedData = parseVlmOutput(vlmOutput);
    logger.info(`完整解析后的数据: ${JSON.stringify(parsedData)}`);
    logger.info(`解析后的数据概要: brand=${parsedData.brand}, name=${parsedData.name}, ingredients数量=${parsedData.ingredients ? parsedData.ingredients.length : 0}`);
    
    // 准备产品信息和配料信息
    const newProduct = {
      brand: parsedData.brand || '未知品牌',
      name: parsedData.name || '未知产品',
      productType: parsedData.productType || '未知类型',
      imageUrl
    };
    
    // 处理配料信息
    const ingredientItems = Array.isArray(parsedData.ingredients) 
      ? parsedData.ingredients.map(item => {
          if (typeof item === 'string') {
            return {
              name: item,
              isHarmful: false, // 默认设置
              harmfulLevel: 0   // 默认设置
            };
          } else if (typeof item === 'object' && item !== null) {
            return {
              name: item.name || '未知成分',
              isHarmful: item.isHarmful || false,
              harmfulLevel: item.harmfulLevel || 0
            };
          } else {
            return {
              name: '无法识别的成分',
              isHarmful: false,
              harmfulLevel: 0
            };
          }
        })
      : [{ name: '无法解析配料', isHarmful: false, harmfulLevel: 0 }];
    
    const newIngredients = {
      ingredientsList: parsedData.ingredientsList,
      ingredients: ingredientItems
    };
    
    // 🎯 核心新功能：产品去重检查
    logger.info(`开始进行产品去重检查: ${newProduct.name}`);
    const duplicationCheck = await checkProductDuplication(newProduct, newIngredients);
    logger.info(`去重检查结果: ${duplicationCheck.recommendation} - ${duplicationCheck.message}`);
    
    let finalProduct = null;
    let finalIngredients = null;
    let duplicateHandled = false;
    
    // 根据去重检查结果处理
    if (duplicationCheck.isDuplicate) {
      const bestMatch = duplicationCheck.bestMatch;
      const confidence = bestMatch.similarity.confidence;
      
      if (duplicationCheck.recommendation === 'skip') {
        // 高度相似，跳过保存，返回现有产品
        logger.info(`检测到高度重复产品，跳过保存并返回现有产品: ${bestMatch.product.name}`);
        finalProduct = bestMatch.product;
        finalIngredients = bestMatch.ingredients;
        duplicateHandled = true;
        
      } else if (duplicationCheck.recommendation === 'merge') {
        // 中度相似，尝试合并信息
        logger.info(`检测到中度重复产品，尝试合并信息: ${bestMatch.product.name}`);
        
        const merged = mergeProductInformation(
          bestMatch.product, 
          newProduct, 
          bestMatch.ingredients, 
          newIngredients
        );
        
        if (merged.changes.length > 0) {
          // 有信息需要更新，执行合并
          logger.info(`合并产品信息，更新项目: ${merged.changes.join(', ')}`);
          
          // 保存更新后的产品信息
          const productToUpdate = await Product.findById(bestMatch.product._id);
          if (productToUpdate) {
            Object.assign(productToUpdate, merged.product);
            await productToUpdate.save();
            finalProduct = productToUpdate;
            logger.info(`产品信息已更新: ${productToUpdate._id}`);
          }
          
          // 保存更新后的配料信息
          if (merged.ingredients && bestMatch.ingredients) {
            const ingredientToUpdate = await Ingredient.findById(bestMatch.ingredients._id);
            if (ingredientToUpdate) {
              Object.assign(ingredientToUpdate, merged.ingredients);
              await ingredientToUpdate.save();
              finalIngredients = ingredientToUpdate;
              logger.info(`配料信息已更新: ${ingredientToUpdate._id}`);
            }
          }
          
        } else {
          // 没有新信息，直接使用现有产品
          finalProduct = bestMatch.product;
          finalIngredients = bestMatch.ingredients;
        }
        
        duplicateHandled = true;
      }
      // 如果 recommendation 是 'proceed'，则继续正常流程保存新产品
    }
    
    // 如果没有处理重复产品，或者建议继续添加，则保存新产品
    if (!duplicateHandled) {
      logger.info(`保存新产品: ${newProduct.name}`);
      
      // 保存产品信息到数据库
      const product = Product(newProduct);
      await product.save();
      logger.info(`产品信息已保存: ${product._id}`);
      finalProduct = product;
      
      // 保存配料信息到数据库
      const ingredient = Ingredient({
        productId: product._id,
        ...newIngredients
      });
      await ingredient.save();
      logger.info(`配料信息已保存: ${ingredient._id}`);
      finalIngredients = ingredient;
    }
    
    // 进行健康评分分析（如果配料信息还没有健康评分）
    let healthScoreData = null;
    try {
      // 检查是否已有健康评分
      const needHealthScore = !finalIngredients.healthScore || 
                              !finalIngredients.scoreAnalyzedAt ||
                              (duplicateHandled && duplicationCheck.recommendation === 'merge');
      
      if (needHealthScore) {
        logger.info(`开始对产品进行健康评分: ${finalProduct.name}`);
        healthScoreData = await healthScoreService.analyzeHealthScore(
          finalIngredients.ingredientsList,
          finalProduct.name,
          finalProduct.productType
        );
        logger.info(`健康评分完成: ${finalProduct.name} - 评分: ${healthScoreData.healthScore}`);
        
        // 更新配料信息中的健康评分
        if (finalIngredients.updateHealthScore) {
          // 内存模式
          finalIngredients.updateHealthScore(healthScoreData);
        } else {
          // MongoDB模式
          finalIngredients.healthScore = healthScoreData.healthScore;
          finalIngredients.healthLevel = healthScoreData.healthLevel;
          finalIngredients.healthAnalysis = healthScoreData.analysis;
          finalIngredients.mainIssues = healthScoreData.mainIssues || [];
          finalIngredients.goodPoints = healthScoreData.goodPoints || [];
          finalIngredients.scoreAnalyzedAt = new Date();
          await finalIngredients.save();
        }
        
        logger.info(`健康评分信息已更新到数据库`);
      } else {
        // 使用现有的健康评分
        healthScoreData = {
          healthScore: finalIngredients.healthScore,
          healthLevel: finalIngredients.healthLevel,
          analysis: finalIngredients.healthAnalysis,
          mainIssues: finalIngredients.mainIssues || [],
          goodPoints: finalIngredients.goodPoints || []
        };
        logger.info(`使用现有健康评分: ${finalProduct.name} - 评分: ${healthScoreData.healthScore}`);
      }
    } catch (healthError) {
      logger.error(`健康评分分析失败: ${healthError.message}`);
      // 健康评分失败不影响主流程，继续返回其他信息
    }
    
    // 构建返回数据
    const responseData = {
      product: {
        id: finalProduct._id,
        brand: finalProduct.brand,
        name: finalProduct.name,
        productType: finalProduct.productType,
        imageUrl: finalProduct.imageUrl
      },
      ingredients: {
        id: finalIngredients._id,
        ingredientsList: finalIngredients.ingredientsList,
        ingredients: finalIngredients.ingredients
      }
    };
    
    // 添加去重处理信息
    if (duplicationCheck.isDuplicate) {
      responseData.deduplication = {
        isDuplicate: true,
        action: duplicationCheck.recommendation,
        message: duplicationCheck.message,
        similarity: duplicationCheck.bestMatch.similarity.overallSimilarity,
        confidence: duplicationCheck.bestMatch.similarity.confidence
      };
    } else {
      responseData.deduplication = {
        isDuplicate: false,
        action: 'new_product',
        message: '未发现重复产品，已添加新产品'
      };
    }
    
    // 如果健康评分成功，添加健康评分信息
    if (healthScoreData) {
      responseData.ingredients.healthScore = healthScoreData.healthScore;
      responseData.ingredients.healthLevel = healthScoreData.healthLevel;
      responseData.ingredients.healthAnalysis = healthScoreData.analysis;
      responseData.ingredients.mainIssues = healthScoreData.mainIssues;
      responseData.ingredients.goodPoints = healthScoreData.goodPoints;
      responseData.ingredients.scoreAnalyzedAt = finalIngredients.scoreAnalyzedAt;
    }
    
    // 返回处理结果
    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    logger.error(`图片分析处理失败: ${error.message}`);
    
    // 处理特定的错误类型
    let errorMessage = `处理失败: ${error.message}`;
    let statusCode = 500;
    
    // 处理图片下载超时的情况
    if (error.message.includes('Download the media resource timed out') || 
        error.message.includes('timed out during the data inspection process')) {
      errorMessage = 'Qwen 模型请求图片失败，请更换其他图片链接并重试';
      statusCode = 400;
    }
    // 处理API调用超时的情况
    else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      errorMessage = 'API请求超时，请稍后重试';
      statusCode = 408;
    }
    // 处理API认证错误的情况
    else if (error.message.includes('401') || error.message.includes('认证失败')) {
      errorMessage = 'API认证失败，请联系管理员检查系统配置';
      statusCode = 401;
    }
    
    res.status(statusCode).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export { analyzeImageController }; 