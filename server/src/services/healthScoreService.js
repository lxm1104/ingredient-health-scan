import OpenAI from 'openai';
import { logger } from '../config/database.js';

// ModelScope API配置
const MODELSCOPE_API_KEY = '9f0089e1-555c-4f71-8cef-fcf97d02b181';
const MODELSCOPE_BASE_URL = 'https://api-inference.modelscope.cn/v1/';

/**
 * 健康评分分析服务
 * 使用Qwen3-32B模型分析配料表健康程度
 */
class HealthScoreService {
  constructor() {
    this.client = new OpenAI({
      baseURL: MODELSCOPE_BASE_URL,
      apiKey: MODELSCOPE_API_KEY
    });
  }

  /**
   * 创建健康评分分析的prompt
   * @param {string} ingredientsList - 配料表文本
   * @param {string} productName - 产品名称
   * @param {string} productType - 产品类型
   * @returns {string} 分析prompt
   */
  createHealthScorePrompt(ingredientsList, productName, productType) {
    return `你是一位专业的食品营养师和健康专家。请分析以下产品的配料表，给出客观的健康评分（60-95分）。

产品信息：
- 产品名称：${productName}
- 产品类型：${productType}
- 配料表：${ingredientsList}

评分标准：
- 90-95分：几乎无添加剂，成分天然，营养价值高，非常健康
- 80-89分：少量无害添加剂，整体健康，适合日常食用
- 70-79分：含有一些常见添加剂，营养一般，建议适量食用
- 60-69分：添加剂较多，营养价值低，建议谨慎选择
- 60分以下：添加剂过多，不建议经常食用

重点关注因素：
1. 添加剂种类和数量（防腐剂、色素、香精、甜味剂等）
2. 天然成分比例
3. 营养成分质量
4. 是否含有反式脂肪、高钠、高糖等不健康成分
5. 成分排序（前几位成分的健康程度）

请以以下JSON格式返回结果，不要包含其他内容：
{
  "healthScore": 数字分数(60-95),
  "healthLevel": "健康等级(优秀/良好/一般/较差)",
  "analysis": "详细分析说明(100字以内)",
  "mainIssues": ["主要健康问题列表"],
  "goodPoints": ["健康亮点列表"]
}`;
  }

  /**
   * 调用Qwen3-32B模型进行健康评分分析
   * @param {string} ingredientsList - 配料表文本
   * @param {string} productName - 产品名称
   * @param {string} productType - 产品类型
   * @returns {Promise<Object>} 健康评分结果
   */
  async analyzeHealthScore(ingredientsList, productName, productType) {
    try {
      logger.info(`开始分析产品健康评分: ${productName}`);
      
      if (!ingredientsList || ingredientsList.trim() === '') {
        throw new Error('配料表为空，无法进行健康评分');
      }

      const prompt = this.createHealthScorePrompt(ingredientsList, productName, productType);
      
      logger.info('发送健康评分分析请求到Qwen3-32B模型');
      
      // 使用流式响应
      const stream = await this.client.chat.completions.create({
        model: 'Qwen/Qwen3-32B',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: true,
        temperature: 0.1, // 降低随机性，确保结果一致性
        extra_body: {
          enable_thinking: true
        }
      });

      let fullResponse = '';
      let doneThinking = false;
      
      // 处理流式响应
      for await (const chunk of stream) {
        const reasoningContent = chunk.choices[0]?.delta?.reasoning_content;
        const answerContent = chunk.choices[0]?.delta?.content;
        
        if (reasoningContent && reasoningContent !== '') {
          // 思考过程，记录但不处理
          logger.info(`模型思考: ${reasoningContent.slice(0, 100)}...`);
        } else if (answerContent && answerContent !== '') {
          if (!doneThinking) {
            logger.info('模型开始输出最终答案');
            doneThinking = true;
          }
          fullResponse += answerContent;
        }
      }

      logger.info(`模型完整响应: ${fullResponse}`);

      // 解析JSON响应
      const result = this.parseHealthScoreResponse(fullResponse);
      
      logger.info(`健康评分分析完成: ${productName} - 评分: ${result.healthScore}`);
      
      return result;

    } catch (error) {
      logger.error(`健康评分分析失败: ${error.message}`);
      logger.error(`错误详情: ${error.stack}`);
      
      // 如果API调用失败，返回默认评分
      return this.getDefaultHealthScore(ingredientsList, productName);
    }
  }

  /**
   * 解析模型响应，提取健康评分结果
   * @param {string} response - 模型响应文本
   * @returns {Object} 解析后的健康评分结果
   */
  parseHealthScoreResponse(response) {
    try {
      // 尝试提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('响应中找不到JSON格式数据');
      }

      const jsonStr = jsonMatch[0];
      const result = JSON.parse(jsonStr);

      // 验证必要字段
      if (!result.healthScore || typeof result.healthScore !== 'number') {
        throw new Error('健康评分字段缺失或格式错误');
      }

      // 确保评分在合理范围内
      result.healthScore = Math.max(60, Math.min(95, result.healthScore));

      // 设置默认值
      result.healthLevel = result.healthLevel || this.getHealthLevel(result.healthScore);
      result.analysis = result.analysis || '基于配料表进行的综合健康评估';
      result.mainIssues = result.mainIssues || [];
      result.goodPoints = result.goodPoints || [];

      return result;

    } catch (error) {
      logger.error(`解析健康评分响应失败: ${error.message}`);
      throw new Error('健康评分响应解析失败');
    }
  }

  /**
   * 根据评分获取健康等级
   * @param {number} score - 健康评分
   * @returns {string} 健康等级
   */
  getHealthLevel(score) {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (score >= 70) return '一般';
    return '较差';
  }

  /**
   * 获取默认健康评分（当API调用失败时使用）
   * @param {string} ingredientsList - 配料表文本
   * @param {string} productName - 产品名称
   * @returns {Object} 默认健康评分结果
   */
  getDefaultHealthScore(ingredientsList, productName) {
    logger.warn(`使用默认健康评分算法: ${productName}`);

    // 简单的关键词分析
    const harmful = ['防腐剂', '色素', '香精', '甜味剂', '增稠剂', '乳化剂', '抗氧化剂', '调味剂'];
    const natural = ['纯', '天然', '有机', '无添加', '鲜', '原味'];

    let score = 75; // 基础分数
    
    // 检查有害添加剂
    harmful.forEach(keyword => {
      if (ingredientsList.includes(keyword)) {
        score -= 5;
      }
    });

    // 检查天然成分
    natural.forEach(keyword => {
      if (ingredientsList.includes(keyword) || productName.includes(keyword)) {
        score += 3;
      }
    });

    // 确保分数在合理范围内
    score = Math.max(60, Math.min(95, score));

    return {
      healthScore: score,
      healthLevel: this.getHealthLevel(score),
      analysis: '基于关键词分析的健康评分（API调用失败时的备用方案）',
      mainIssues: ['API调用失败，使用简化评分算法'],
      goodPoints: []
    };
  }
}

// 导出单例实例
const healthScoreService = new HealthScoreService();
export default healthScoreService; 