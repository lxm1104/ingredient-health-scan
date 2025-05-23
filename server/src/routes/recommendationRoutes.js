import express from 'express';
import { getProductCategories, getRecommendedProducts } from '../controllers/recommendationController.js';

const router = express.Router();

/**
 * @route GET /recommendations/categories
 * @desc 获取所有产品类型（去重）
 * @access Public
 */
router.get('/categories', getProductCategories);

/**
 * @route GET /recommendations/products
 * @desc 获取推荐产品列表
 * @query {string} category - 产品类别筛选（可选，默认"全部"）
 * @query {string} sortBy - 排序方式（可选，默认"healthScore"）
 * @query {number} limit - 返回数量限制（可选，默认50）
 * @access Public
 */
router.get('/products', getRecommendedProducts);

export default router; 