import request from 'supertest';
import express from 'express';
import { getProductCategories, getRecommendedProducts } from '../controllers/recommendationController.js';

// 创建测试应用
const app = express();
app.use(express.json());

// 设置测试路由
app.get('/recommendations/categories', getProductCategories);
app.get('/recommendations/products', getRecommendedProducts);

describe('推荐控制器测试', () => {
  
  describe('GET /recommendations/categories', () => {
    test('应该返回产品类型列表', async () => {
      const response = await request(app)
        .get('/recommendations/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
      expect(response.body.data.categories).toContain('全部');
    });
  });

  describe('GET /recommendations/products', () => {
    test('应该返回推荐产品列表', async () => {
      const response = await request(app)
        .get('/recommendations/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('products');
      expect(Array.isArray(response.body.data.products)).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('category');
      expect(response.body.data).toHaveProperty('sortBy');
    });

    test('应该支持按类别筛选', async () => {
      const response = await request(app)
        .get('/recommendations/products?category=糕点/饼干')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('糕点/饼干');
      
      // 检查返回的产品是否都属于指定类别
      response.body.data.products.forEach(product => {
        expect(product.category).toBe('糕点/饼干');
      });
    });

    test('应该支持限制返回数量', async () => {
      const response = await request(app)
        .get('/recommendations/products?limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBeLessThanOrEqual(2);
    });

    test('产品应该包含必要的字段', async () => {
      const response = await request(app)
        .get('/recommendations/products?limit=1')
        .expect(200);

      if (response.body.data.products.length > 0) {
        const product = response.body.data.products[0];
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('brand');
        expect(product).toHaveProperty('category');
        expect(product).toHaveProperty('image');
        expect(product).toHaveProperty('healthScore');
        expect(product).toHaveProperty('description');
        
        // 检查健康评分范围
        expect(product.healthScore).toBeGreaterThanOrEqual(60);
        expect(product.healthScore).toBeLessThanOrEqual(95);
      }
    });
  });
}); 