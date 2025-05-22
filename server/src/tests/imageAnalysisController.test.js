import request from 'supertest';
import express from 'express';
import { analyzeImageController } from '../controllers/imageAnalysisController.js';
import * as vlmService from '../services/vlmService.js';
import Product from '../models/Product.js';
import Ingredient from '../models/Ingredient.js';

// 模拟VLM服务
jest.mock('../services/vlmService.js');

// 模拟MongoDB模型
jest.mock('../models/Product.js');
jest.mock('../models/Ingredient.js');

// 模拟日志
jest.mock('../config/database.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// 设置Express应用
const app = express();
app.use(express.json());
app.post('/api/analyze-image', analyzeImageController);

describe('图片分析控制器', () => {
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 模拟VLM服务返回值
    vlmService.analyzeImage.mockResolvedValue(`
      {
        "brand": "乐事",
        "name": "原味薯片",
        "productType": "膨化食品",
        "ingredientsList": "马铃薯、植物油、食盐",
        "ingredients": ["马铃薯", "植物油", "食盐"]
      }
    `);
    
    vlmService.parseVlmOutput.mockReturnValue({
      brand: "乐事",
      name: "原味薯片",
      productType: "膨化食品",
      ingredientsList: "马铃薯、植物油、食盐",
      ingredients: ["马铃薯", "植物油", "食盐"]
    });
    
    // 模拟MongoDB模型
    Product.mockImplementation(() => ({
      _id: 'mock-product-id',
      brand: "乐事",
      name: "原味薯片",
      productType: "膨化食品",
      imageUrl: "http://example.com/image.jpg",
      save: jest.fn().mockResolvedValue(true)
    }));
    
    Ingredient.mockImplementation(() => ({
      _id: 'mock-ingredient-id',
      productId: 'mock-product-id',
      ingredientsList: "马铃薯、植物油、食盐",
      ingredients: [
        { name: "马铃薯", isHarmful: false, harmfulLevel: 0 },
        { name: "植物油", isHarmful: false, harmfulLevel: 0 },
        { name: "食盐", isHarmful: false, harmfulLevel: 0 }
      ],
      save: jest.fn().mockResolvedValue(true)
    }));
  });
  
  test('应成功处理有效的图片URL请求', async () => {
    const response = await request(app)
      .post('/api/analyze-image')
      .send({ imageUrl: 'http://example.com/image.jpg' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('product');
    expect(response.body.data).toHaveProperty('ingredients');
    expect(response.body.data.product).toHaveProperty('id', 'mock-product-id');
    expect(response.body.data.ingredients).toHaveProperty('id', 'mock-ingredient-id');
    
    // 验证调用
    expect(vlmService.analyzeImage).toHaveBeenCalledWith('http://example.com/image.jpg');
    expect(vlmService.parseVlmOutput).toHaveBeenCalled();
  });
  
  test('应拒绝没有图片URL的请求', async () => {
    const response = await request(app)
      .post('/api/analyze-image')
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('请提供图片URL');
  });
  
  test('应拒绝无效的图片URL请求', async () => {
    const response = await request(app)
      .post('/api/analyze-image')
      .send({ imageUrl: 'invalid-url' });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('请提供有效的图片URL');
  });
  
  test('应处理VLM服务错误', async () => {
    // 模拟VLM服务抛出错误
    vlmService.analyzeImage.mockRejectedValue(new Error('模型调用失败'));
    
    const response = await request(app)
      .post('/api/analyze-image')
      .send({ imageUrl: 'http://example.com/image.jpg' });
    
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('模型调用失败');
  });
  
  test('应处理数据库保存错误', async () => {
    // 模拟数据库保存失败
    Product.mockImplementation(() => ({
      save: jest.fn().mockRejectedValue(new Error('数据库保存失败'))
    }));
    
    const response = await request(app)
      .post('/api/analyze-image')
      .send({ imageUrl: 'http://example.com/image.jpg' });
    
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('数据库保存失败');
  });
}); 