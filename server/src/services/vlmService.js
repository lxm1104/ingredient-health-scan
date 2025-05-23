import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { logger } from '../config/database.js';

// 加载环境变量
dotenv.config();

// 创建 OpenAI 客户端 - 根据ModelScope官方示例
const client = new OpenAI({
  baseURL: process.env.MODELSCOPE_BASE_URL || 'https://api-inference.modelscope.cn/v1',
  apiKey: process.env.MODELSCOPE_API_KEY || 'MODELSCOPE_SDK_TOKEN', // 默认使用环境变量中的TOKEN
});

// 记录API配置信息，用于调试
logger.info(`ModelScope 配置: baseURL=${process.env.MODELSCOPE_BASE_URL || 'https://api-inference.modelscope.cn/v1'}, apiKey=${client.apiKey ? '已设置' : '未设置'}`);

// 检查API密钥是否存在
if (!client.apiKey) {
  logger.error('未配置ModelScope API密钥，请在.env文件中设置MODELSCOPE_API_KEY');
}

/**
 * 调用VLM模型分析图片
 * @param {string} imageUrl - 图片URL
 * @returns {Promise<string>} - 模型的分析结果
 */
async function analyzeImage(imageUrl) {
  try {
    logger.info(`开始分析图片: ${imageUrl}`);
    
    // 检查API密钥是否配置
    if (!client.apiKey) {
      throw new Error('ModelScope API密钥未配置，请在.env文件中设置MODELSCOPE_API_KEY');
    }
    
    // 构造提示
    const prompt = `请仔细分析这张食品包装或配料表图片，重点关注图片中的文字信息，提取以下关键信息：

1. 品牌名称 - 非常重要！请特别仔细查找：
   - 通常位于包装的顶部、左上角或右上角
   - 可能是较大的字体或特殊字体
   - 常见的品牌标识如logo旁的文字
   - 可能包含英文、中文或组合
   - 如果有多个品牌相关文字，选择最主要的品牌名
   - 注意区分品牌名和产品名（品牌通常更简短）
   - 品牌名可能出现在以下位置：
     * 包装顶部的大字体文字
     * Logo图标旁边的文字
     * 包装四个角落的任何位置
     * 产品名称上方或下方的小字体
     * 包装背面或侧面的制造商信息
   - 常见品牌名特征：
     * 通常比产品名更简洁
     * 可能是英文、中文或英文+中文组合
     * 字体可能有特殊设计或颜色
     * 经常与商标符号®或™一起出现

2. 产品名称 - 具体的产品名字：
   - 通常位于包装正中央或显著位置
   - 描述产品具体是什么（如xx饼干、xx饮料等）
   - 可能包含口味、规格等描述

3. 产品类型 - 食品分类：
   - 如：饮料、饼干、糕点、膨化食品、方便面、酱油、醋等
   - 根据产品特征判断分类

4. 完整的配料表信息：
   - 通常标有"配料表"、"配料"、"成分"等字样
   - 仅提取各项配料的内容，不要提取过敏原信息、食品生产许可证编号、保质期、食用方法、生产日期等与配料无关的内容
   - 按照实际显示的顺序和格式记录

5. 每项配料的名字：
   - 将配料表拆分为单独的配料项
   - 去除含量信息和特殊符号
   - 只保留配料的名称

请按以下JSON格式严格输出，不要添加任何额外说明：
{
  "brand": "品牌名称",
  "name": "产品名称", 
  "productType": "产品类型",
  "ingredientsList": "完整的配料表信息",
  "ingredients": ["配料1", "配料2", "配料3", ...]
}

注意事项：
- 如果某项信息在图片中找不到，对应字段返回空字符串""
- 品牌识别务必仔细，多角度查看图片，仔细检查每个文字
- 确保JSON格式正确，可以被解析
- 所有文字都要准确识别，不要出现错别字
- 特别注意：即使品牌名称很小或不明显，也要努力识别出来
`;

    // 调用模型 - 严格按照ModelScope官方示例
    const modelId = process.env.MODELSCOPE_MODEL || 'Qwen/Qwen2.5-VL-32B-Instruct';
    logger.info(`🚀 准备调用升级后的VLM模型: ${modelId}`);
    
    // 构建消息体
    const messages = [
      {
        role: "system",
        content: [
          {
            type: "text", 
            text: "你是一个专业的食品包装文字识别助手。你的主要任务是从食品包装图片中准确识别品牌名称、产品名称、产品类型和配料信息。\n\n品牌名称识别是你最重要的任务！请特别注意：\n1. 仔细扫描图片的每个角落，包括顶部、底部、左右两侧\n2. 品牌名称可能很小，可能在不起眼的位置\n3. 品牌名称可能是英文、中文或混合文字\n4. 注意Logo旁边的文字，这通常是品牌名\n5. 制造商信息中通常包含品牌名\n6. 即使字体很小或模糊，也要努力识别\n7. 品牌名称通常比产品名称更简短、更抽象\n\n请用你最强的文字识别能力，确保不遗漏任何可能的品牌信息。"
          }
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: imageUrl
            }
          },
          {
            type: "text", 
            text: prompt
          },
        ],
      }
    ];
    
    logger.info('API请求消息体构建完成，准备发送请求');
    logger.info(`请求详情: modelId=${modelId}, imageUrl=${imageUrl},完整提示文本: ${prompt}`);
    // 调用API - 严格按照ModelScope官方示例
    const requestParams = {
      model: modelId,
      messages: messages,
      temperature: 0.2, // 降低随机性，提高一致性
      stream: false
    };
    
    logger.info(`API请求参数: ${JSON.stringify(requestParams, null, 2)}`);
    
    const response = await client.chat.completions.create(requestParams);

    // 记录完整的 API 响应内容，方便调试
    logger.info('收到API响应');
    logger.info(`完整的 API 响应内容: ${JSON.stringify(response)}`);
    
    if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
      logger.error('API响应格式错误，详细响应: ' + JSON.stringify(response));
      throw new Error('API响应格式错误');
    }
    
    const result = response.choices[0].message.content;
    logger.info(`图片分析完成，结果长度: ${result ? result.length : 0}`);
    // 记录完整的结果内容
    logger.info(`图片分析完整结果内容: ${result}`);
    return result;
  }   catch (error) {
    // 输出更详细的错误信息
    logger.error(`图片分析失败: ${error.message}`);
    
    // 检查是否为OpenAI API错误
    if (error.name === 'OpenAIError') {
      logger.error(`OpenAI API错误: ${error.message}`);
      logger.error(`错误类型: ${error.type || '未知'}`);
      logger.error(`错误代码: ${error.code || '未知'}`);
      logger.error(`状态码: ${error.status || '未知'}`);
      
      // 如果是认证错误，提供更明确的提示
      if (error.status === 401) {
        logger.error('API密钥认证失败，请确认您的ModelScope SDK Token是否正确设置');
        logger.error('请访问 https://modelscope.cn/my/myaccesstoken 获取正确的Token');
      }
    }
    
    if (error.response) {
      logger.error(`错误状态码: ${error.response.status}`);
      logger.error(`错误响应体: ${JSON.stringify(error.response.data || {})}`);
    }
    
    if (error.request) {
      logger.error('请求已发送但没有收到响应');
    }
    
    // 记录完整错误对象，但排除循环引用
    try {
      const errorJson = JSON.stringify(error, (key, value) => {
        if (key === 'request' || key === 'response') return '[省略]';
        return value;
      });
      logger.error(`错误详情: ${errorJson}`);
    } catch (e) {
      logger.error('无法序列化错误对象');
    }
    
    throw new Error(`图片分析失败: ${error.message}`);
  }
}

/**
 * 解析VLM输出的结果
 * @param {string} vlmOutput - VLM模型输出的文本
 * @returns {Object} - 解析后的产品信息和配料表
 */
function parseVlmOutput(vlmOutput) {
  try {
    logger.info('开始解析模型输出');
    // 记录完整的原始输出内容
    logger.info(`原始输出内容: ${vlmOutput}`);
    
    // 尝试提取JSON部分
    const jsonMatch = vlmOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error('无法从模型输出中提取JSON数据，尝试创建默认数据');
      // 创建默认数据结构
      return {
        brand: "解析失败-未知品牌",
        name: "解析失败-未知产品",
        productType: "未知类型",
        ingredientsList: vlmOutput,
        ingredients: ["无法解析成分列表"]
      };
    }

    // 尝试手动修复常见的JSON格式问题
    let jsonText = jsonMatch[0];
    
    // 修复可能的JSON错误：缺少逗号的数组
    jsonText = jsonText.replace(/("[^"]*")\s+("[^"]*")/g, '$1, $2');
    
    // 修复多余的逗号
    jsonText = jsonText.replace(/,\s*([}\]])/g, '$1');
    
    // 记录完整的修正后 JSON
    logger.info(`尝试解析修正后的JSON: ${jsonText}`);
    
    try {
      // 尝试解析JSON
      const data = JSON.parse(jsonText);
      
      // 记录解析后的数据
      logger.info(`JSON解析成功: ${JSON.stringify(data)}`);
      
      // 验证并设置默认值
      const result = {
        brand: data.brand || "未知品牌",
        name: data.name || "未知产品",
        productType: data.productType || "未知类型",
        ingredientsList: data.ingredientsList || "",
        ingredients: []
      };
      
      // 处理配料列表
      if (data.ingredients && Array.isArray(data.ingredients) && data.ingredients.length > 0) {
        result.ingredients = data.ingredients;
      } else if (result.ingredientsList) {
        // 从配料表文本中解析
        result.ingredients = result.ingredientsList
          .split(/[,，、；;]/)
          .map(item => item.trim())
          .filter(item => item.length > 0);
      }
      
      logger.info('模型输出解析完成');
      return result;
    } catch (jsonError) {
      logger.error(`JSON解析失败: ${jsonError.message}，尝试更强力的修复`);
      
      // 如果JSON解析失败，尝试直接从文本中提取关键信息
      const brandMatch = vlmOutput.match(/["']?brand["']?\s*:\s*["']([^"']+)["']/i);
      const nameMatch = vlmOutput.match(/["']?name["']?\s*:\s*["']([^"']+)["']/i);
      const typeMatch = vlmOutput.match(/["']?productType["']?\s*:\s*["']([^"']+)["']/i);
      const ingredientsListMatch = vlmOutput.match(/["']?ingredientsList["']?\s*:\s*["']([^"']+)["']/i);
      
      const result = {
        brand: brandMatch ? brandMatch[1] : "解析失败-未知品牌",
        name: nameMatch ? nameMatch[1] : "解析失败-未知产品",
        productType: typeMatch ? typeMatch[1] : "未知类型",
        ingredientsList: ingredientsListMatch ? ingredientsListMatch[1] : "无法解析配料表",
        ingredients: []
      };
      
      // 从配料表文本中解析
      if (result.ingredientsList && result.ingredientsList !== "无法解析配料表") {
        result.ingredients = result.ingredientsList
          .split(/[,，、；;]/)
          .map(item => item.trim())
          .filter(item => item.length > 0);
      } else {
        result.ingredients = ["无法解析成分列表"];
      }
      
      logger.info('通过备用方式完成模型输出解析');
      return result;
    }
  } catch (error) {
    logger.error(`解析模型输出失败: ${error.message}`);
    logger.error(`尝试使用默认值`);
    
    // 返回默认值以避免程序崩溃
    return {
      brand: "解析错误-未知品牌",
      name: "解析错误-未知产品",
      productType: "未知类型",
      ingredientsList: "解析错误，无法提取配料表",
      ingredients: ["解析错误"]
    };
  }
}

export { analyzeImage, parseVlmOutput }; 