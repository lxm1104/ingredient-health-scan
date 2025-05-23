import express from 'express';
import { getProductCategories, getRecommendedProducts, getSimilarProducts, getProductDetail } from '../controllers/recommendationController.js';

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

/**
 * @route GET /recommendations/similar
 * @desc 获取基于产品类型的同类推荐产品
 * @query {string} productType - 产品类型（必需）
 * @query {string} excludeId - 要排除的产品ID（可选）
 * @query {number} limit - 返回数量限制（可选，默认5）
 * @access Public
 */
router.get('/similar', getSimilarProducts);

/**
 * @route GET /recommendations/product/:id
 * @desc 获取产品详细信息
 * @param {string} id - 产品ID（必需）
 * @access Public
 */
router.get('/product/:id', getProductDetail);

export default router; 