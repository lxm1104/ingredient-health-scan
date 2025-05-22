import express from 'express';
import { analyzeImageController } from '../controllers/imageAnalysisController.js';

const router = express.Router();

// 定义图片分析路由
router.post('/analyze-image', analyzeImageController);

export default router; 