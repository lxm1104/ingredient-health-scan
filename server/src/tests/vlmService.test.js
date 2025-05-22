import { parseVlmOutput } from '../services/vlmService.js';

// 模拟测试数据
const mockVlmOutput = `
根据图片分析，这是一包乐事原味薯片。以下是提取的信息：

{
  "brand": "乐事",
  "name": "原味薯片",
  "productType": "膨化食品",
  "ingredientsList": "马铃薯、植物油、食盐、调味料(味精、香精)",
  "ingredients": ["马铃薯", "植物油", "食盐", "调味料", "味精", "香精"]
}
`;

// 模拟没有单独配料列表的输出
const mockVlmOutputWithoutIngredients = `
根据图片分析，这是一包乐事原味薯片。以下是提取的信息：

{
  "brand": "乐事",
  "name": "原味薯片",
  "productType": "膨化食品",
  "ingredientsList": "马铃薯、植物油、食盐、调味料(味精、香精)"
}
`;

// 模拟不完整输出
const mockIncompleteVlmOutput = `
根据图片分析，这是一包薯片。以下是提取的信息：

{
  "name": "原味薯片",
  "productType": "膨化食品"
}
`;

// 模拟非JSON输出
const mockNonJsonOutput = `
根据图片分析，这是一包乐事原味薯片。
品牌: 乐事
名称: 原味薯片
类型: 膨化食品
配料: 马铃薯、植物油、食盐、调味料(味精、香精)
`;

describe('VLM Service - parseVlmOutput', () => {
  // 测试正常输出解析
  test('应正确解析VLM输出', () => {
    const result = parseVlmOutput(mockVlmOutput);
    
    expect(result).toHaveProperty('brand', '乐事');
    expect(result).toHaveProperty('name', '原味薯片');
    expect(result).toHaveProperty('productType', '膨化食品');
    expect(result).toHaveProperty('ingredientsList', '马铃薯、植物油、食盐、调味料(味精、香精)');
    expect(result).toHaveProperty('ingredients');
    expect(Array.isArray(result.ingredients)).toBe(true);
    expect(result.ingredients).toContain('马铃薯');
    expect(result.ingredients).toContain('植物油');
  });

  // 测试没有单独配料列表的输出解析
  test('应从配料表文本中解析出配料列表', () => {
    const result = parseVlmOutput(mockVlmOutputWithoutIngredients);
    
    expect(result).toHaveProperty('ingredients');
    expect(Array.isArray(result.ingredients)).toBe(true);
    expect(result.ingredients.length).toBeGreaterThan(0);
    expect(result.ingredients).toContain('马铃薯');
    expect(result.ingredients).toContain('植物油');
  });

  // 测试不完整输出
  test('应在缺少必要字段时抛出错误', () => {
    expect(() => {
      parseVlmOutput(mockIncompleteVlmOutput);
    }).toThrow('模型输出缺少必要字段');
  });

  // 测试非JSON输出
  test('应在无法提取JSON时抛出错误', () => {
    expect(() => {
      parseVlmOutput(mockNonJsonOutput);
    }).toThrow('无法从模型输出中提取JSON数据');
  });
}); 