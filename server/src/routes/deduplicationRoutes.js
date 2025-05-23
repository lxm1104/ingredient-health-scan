import express from 'express';
import { 
  getStatsController, 
  batchDeduplicationController, 
  findDuplicatesController 
} from '../controllers/deduplicationController.js';

const router = express.Router();

/**
 * 获取去重统计信息
 * GET /api/deduplication/stats
 */
router.get('/stats', getStatsController);

/**
 * 执行批量去重操作
 * POST /api/deduplication/batch
 * Body: { dryRun: boolean, threshold: number, maxProcessed: number, saveBackup: boolean }
 */
router.post('/batch', batchDeduplicationController);

/**
 * 查找特定产品的可能重复项
 * POST /api/deduplication/find/:productId
 * 或 POST /api/deduplication/find
 * Body: { brand: string, name: string, productType: string }
 */
router.post('/find/:productId?', findDuplicatesController);

export default router; 