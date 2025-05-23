import { jest } from '@jest/globals';
import {
  levenshteinDistance,
  calculateSimilarity,
  preprocessString,
  extractMainIngredients,
  calculateIngredientsSimilarity,
  checkStringContainment
} from '../utils/stringUtils.js';
import {
  calculateProductSimilarity,
  checkProductDuplication,
  mergeProductInformation
} from '../services/productDeduplicationService.js';

/**
 * 产品去重功能单元测试
 */

describe('字符串工具测试', () => {
  describe('编辑距离计算', () => {
    test('相同字符串的编辑距离应为0', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
      expect(levenshteinDistance('乐事薯片', '乐事薯片')).toBe(0);
    });

    test('完全不同字符串的编辑距离', () => {
      expect(levenshteinDistance('abc', 'def')).toBe(3);
      expect(levenshteinDistance('乐事', '百事')).toBe(1);
    });

    test('空字符串处理', () => {
      expect(levenshteinDistance('', 'abc')).toBe(3);
      expect(levenshteinDistance('abc', '')).toBe(3);
      expect(levenshteinDistance('', '')).toBe(0);
    });

    test('部分相似字符串', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('乐事原味薯片', '乐事烧烤薯片')).toBe(2);
    });
  });

  describe('字符串预处理', () => {
    test('去除修饰词和标点符号', () => {
      expect(preprocessString('乐事 原味 薯片')).toBe('乐事薯片');
      expect(preprocessString('百事可乐(经典款)')).toBe('百事可乐');
      expect(preprocessString('康师傅·方便面【红烧牛肉】')).toBe('康师傅方便面红烧牛肉');
    });

    test('标准化单位', () => {
      expect(preprocessString('可乐500毫升')).toBe('可乐500ml');
      expect(preprocessString('薯片100克装')).toBe('薯片100g装');
    });

    test('去除常见修饰词', () => {
      expect(preprocessString('乐事新装原味薯片')).toBe('乐事薯片');
      expect(preprocessString('康师傅经典红烧牛肉面')).toBe('康师傅红烧牛肉面');
      expect(preprocessString('百事可乐限量版')).toBe('百事可乐');
    });
  });

  describe('相似度计算', () => {
    test('完全相同的字符串', () => {
      expect(calculateSimilarity('乐事薯片', '乐事薯片')).toBe(1);
      expect(calculateSimilarity('康师傅红烧牛肉面', '康师傅红烧牛肉面')).toBe(1);
    });

    test('高度相似的字符串', () => {
      const similarity = calculateSimilarity('乐事原味薯片', '乐事薯片');
      expect(similarity).toBeGreaterThan(0.8);
      
      const similarity2 = calculateSimilarity('康师傅红烧牛肉面', '康师傅红烧牛肉方便面');
      expect(similarity2).toBeGreaterThan(0.7);
    });

    test('相似度较低的字符串', () => {
      const similarity = calculateSimilarity('乐事薯片', '百事可乐');
      expect(similarity).toBeLessThan(0.5);
      
      const similarity2 = calculateSimilarity('康师傅方便面', '统一冰红茶');
      expect(similarity2).toBeLessThan(0.3);
    });

    test('空字符串处理', () => {
      expect(calculateSimilarity('', '')).toBe(1);
      expect(calculateSimilarity('test', '')).toBe(0);
      expect(calculateSimilarity('', 'test')).toBe(0);
    });
  });

  describe('包含关系检查', () => {
    test('检查字符串包含关系', () => {
      expect(checkStringContainment('乐事原味薯片', '乐事薯片')).toBe(true);
      expect(checkStringContainment('康师傅红烧牛肉面', '康师傅方便面')).toBe(true);
      expect(checkStringContainment('百事可乐', '雪碧')).toBe(false);
    });

    test('双向包含检查', () => {
      expect(checkStringContainment('薯片', '乐事薯片')).toBe(true);
      expect(checkStringContainment('方便面', '康师傅方便面')).toBe(true);
    });
  });
});

describe('配料表处理测试', () => {
  describe('主要配料提取', () => {
    test('提取前3个主要配料', () => {
      const ingredients = '马铃薯、植物油、食盐、味精、香辛料';
      const main = extractMainIngredients(ingredients, 3);
      expect(main).toEqual(['马铃薯', '植物油', '食盐']);
    });

    test('处理复杂配料表', () => {
      const ingredients = '面粉(含谷蛋白),棕榈油,食盐,蛋白粉,酵母提取物';
      const main = extractMainIngredients(ingredients, 3);
      expect(main).toEqual(['面粉', '棕榈油', '食盐']);
    });

    test('处理包含百分比的配料表', () => {
      const ingredients = '大豆(非转基因)≥36%,白砂糖,食盐';
      const main = extractMainIngredients(ingredients, 3);
      expect(main.length).toBeGreaterThan(0);
      expect(main[0]).toContain('大豆');
    });

    test('空配料表处理', () => {
      expect(extractMainIngredients('')).toEqual([]);
      expect(extractMainIngredients(null)).toEqual([]);
      expect(extractMainIngredients(undefined)).toEqual([]);
    });
  });

  describe('配料相似度计算', () => {
    test('相同配料表的相似度', () => {
      const ingredients1 = '马铃薯、植物油、食盐';
      const ingredients2 = '马铃薯,植物油,食盐';
      const similarity = calculateIngredientsSimilarity(ingredients1, ingredients2);
      expect(similarity).toBeGreaterThan(0.8);
    });

    test('部分相同配料表的相似度', () => {
      const ingredients1 = '马铃薯、植物油、食盐、味精';
      const ingredients2 = '马铃薯、椰子油、食盐、香辛料';
      const similarity = calculateIngredientsSimilarity(ingredients1, ingredients2);
      expect(similarity).toBeGreaterThan(0.5);
      expect(similarity).toBeLessThan(0.9);
    });

    test('完全不同配料表的相似度', () => {
      const ingredients1 = '面粉、酵母、糖';
      const ingredients2 = '牛奶、巧克力、坚果';
      const similarity = calculateIngredientsSimilarity(ingredients1, ingredients2);
      expect(similarity).toBeLessThan(0.3);
    });
  });
});

describe('产品相似度计算测试', () => {
  describe('计算产品综合相似度', () => {
    test('完全相同的产品', () => {
      const product1 = {
        brand: '乐事',
        name: '原味薯片',
        productType: '膨化食品'
      };
      const product2 = {
        brand: '乐事',
        name: '原味薯片',
        productType: '膨化食品'
      };

      const result = calculateProductSimilarity(product1, product2);
      expect(result.isDuplicate).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.overallSimilarity).toBeCloseTo(0.9, 1);
    });

    test('高度相似的产品', () => {
      const product1 = {
        brand: '乐事',
        name: '原味薯片',
        productType: '膨化食品'
      };
      const product2 = {
        brand: '乐事',
        name: '经典原味薯片',
        productType: '膨化食品'
      };

      const result = calculateProductSimilarity(product1, product2);
      expect(result.isDuplicate).toBe(true);
      expect(result.overallSimilarity).toBeGreaterThan(0.85);
    });

    test('不同品牌的相似产品', () => {
      const product1 = {
        brand: '乐事',
        name: '原味薯片',
        productType: '膨化食品'
      };
      const product2 = {
        brand: '品客',
        name: '原味薯片',
        productType: '膨化食品'
      };

      const result = calculateProductSimilarity(product1, product2);
      // 品牌不同，总体相似度应该降低
      expect(result.overallSimilarity).toBeLessThan(0.85);
    });

    test('完全不同的产品', () => {
      const product1 = {
        brand: '乐事',
        name: '原味薯片',
        productType: '膨化食品'
      };
      const product2 = {
        brand: '康师傅',
        name: '红烧牛肉面',
        productType: '方便面'
      };

      const result = calculateProductSimilarity(product1, product2);
      expect(result.isDuplicate).toBe(false);
      expect(result.overallSimilarity).toBeLessThan(0.5);
    });
  });

  describe('包含配料信息的相似度计算', () => {
    test('相同配料的产品相似度提升', () => {
      const product1 = {
        brand: '乐事',
        name: '薯片',
        productType: '膨化食品'
      };
      const product2 = {
        brand: '乐事',
        name: '经典薯片',
        productType: '膨化食品'
      };
      
      const ingredients1 = {
        ingredientsList: '马铃薯、植物油、食盐'
      };
      const ingredients2 = {
        ingredientsList: '马铃薯,植物油,食盐'
      };

      const result = calculateProductSimilarity(product1, product2, ingredients1, ingredients2);
      expect(result.isDuplicate).toBe(true);
      expect(result.ingredientsSimilarity).toBeGreaterThan(0.8);
    });
  });
});

describe('产品信息合并测试', () => {
  test('合并品牌信息', () => {
    const original = {
      brand: '未知品牌',
      name: '薯片',
      productType: '膨化食品'
    };
    const duplicate = {
      brand: '乐事',
      name: '薯片',
      productType: '膨化食品'
    };

    const merged = mergeProductInformation(original, duplicate);
    expect(merged.product.brand).toBe('乐事');
    expect(merged.changes.length).toBeGreaterThan(0);
  });

  test('合并产品名称（选择更详细的）', () => {
    const original = {
      brand: '乐事',
      name: '薯片',
      productType: '膨化食品'
    };
    const duplicate = {
      brand: '乐事',
      name: '经典原味薯片',
      productType: '膨化食品'
    };

    const merged = mergeProductInformation(original, duplicate);
    expect(merged.product.name).toBe('经典原味薯片');
  });

  test('合并配料信息', () => {
    const original = {
      brand: '乐事',
      name: '薯片',
      productType: '膨化食品'
    };
    const duplicate = {
      brand: '乐事',
      name: '薯片',
      productType: '膨化食品'
    };
    
    const originalIngredients = {
      ingredientsList: '马铃薯、植物油',
      ingredients: [
        { name: '马铃薯', isHarmful: false, harmfulLevel: 0 }
      ],
      healthScore: 80
    };
    const duplicateIngredients = {
      ingredientsList: '马铃薯、植物油、食盐、天然香料',
      ingredients: [
        { name: '马铃薯', isHarmful: false, harmfulLevel: 0 },
        { name: '食盐', isHarmful: false, harmfulLevel: 1 }
      ],
      healthScore: 85
    };

    const merged = mergeProductInformation(original, duplicate, originalIngredients, duplicateIngredients);
    expect(merged.ingredients.ingredientsList).toBe('马铃薯、植物油、食盐、天然香料');
    expect(merged.ingredients.healthScore).toBe(85);
  });
});

describe('模拟数据测试场景', () => {
  test('VLM识别结果随机性模拟', () => {
    // 模拟同一产品的不同VLM识别结果
    const scenarios = [
      {
        product1: { brand: '乐事', name: '原味薯片', productType: '膨化食品' },
        product2: { brand: '乐事', name: '经典原味薯片', productType: '薯片' },
        shouldBeDuplicate: true
      },
      {
        product1: { brand: '康师傅', name: '红烧牛肉面', productType: '方便面' },
        product2: { brand: '康师傅', name: '红烧牛肉方便面', productType: '热风干燥方便食品' },
        shouldBeDuplicate: false
      },
      {
        product1: { brand: '未知品牌', name: '豆浆粉', productType: '豆制品' },
        product2: { brand: '益正元', name: '原味豆浆粉', productType: '(Ⅱ类·其他型)速溶豆粉' },
        shouldBeDuplicate: false
      }
    ];

    scenarios.forEach((scenario, index) => {
      const result = calculateProductSimilarity(scenario.product1, scenario.product2);
      if (scenario.shouldBeDuplicate) {
        expect(result.isDuplicate).toBe(true);
      } else {
        expect(result.isDuplicate).toBe(false);
      }
    });
  });

  test('边界相似度测试', () => {
    // 测试在相似度阈值边界的产品
    const product1 = { brand: '乐事', name: '薯片', productType: '膨化食品' };
    const product2 = { brand: '品客', name: '薯片', productType: '膨化食品' };
    
    const result = calculateProductSimilarity(product1, product2);
    // 应该在阈值边界附近，需要人工判断
    expect(result.overallSimilarity).toBeGreaterThan(0.6);
    expect(result.overallSimilarity).toBeLessThan(0.9);
  });
}); 