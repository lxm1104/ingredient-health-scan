import { analyzeImage, parseVlmOutput } from '../services/vlmService.js';
import Product from '../models/Product.js';
import Ingredient from '../models/Ingredient.js';
import { logger } from '../config/database.js';

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
            ]
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
    
    // 解析模型输出
    const parsedData = parseVlmOutput(vlmOutput);
    logger.info(`解析后的数据概要: brand=${parsedData.brand}, name=${parsedData.name}, ingredients数量=${parsedData.ingredients ? parsedData.ingredients.length : 0}`);
    
    // 保存产品信息到数据库
    const product = new Product({
      brand: parsedData.brand || '未知品牌',
      name: parsedData.name || '未知产品',
      productType: parsedData.productType || '未知类型',
      imageUrl
    });
    await product.save();
    logger.info(`产品信息已保存: ${product._id}`);
    
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
    
    // 保存配料信息到数据库
    const ingredient = new Ingredient({
      productId: product._id,
      ingredientsList: parsedData.ingredientsList,
      ingredients: ingredientItems
    });
    await ingredient.save();
    logger.info(`配料信息已保存: ${ingredient._id}`);
    
    // 返回处理结果
    res.status(200).json({
      success: true,
      data: {
        product: {
          id: product._id,
          brand: product.brand,
          name: product.name,
          productType: product.productType,
          imageUrl: product.imageUrl
        },
        ingredients: {
          id: ingredient._id,
          ingredientsList: ingredient.ingredientsList,
          ingredients: ingredient.ingredients
        }
      }
    });
  } catch (error) {
    logger.error(`图片分析处理失败: ${error.message}`);
    res.status(500).json({ success: false, message: `处理失败: ${error.message}` });
  }
}

export { analyzeImageController }; 