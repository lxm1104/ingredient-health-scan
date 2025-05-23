import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import imageRoutes from './routes/imageRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import deduplicationRoutes from './routes/deduplicationRoutes.js';
import { connectDB, logger } from './config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 连接数据库
connectDB();

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 5002;

// 中间件
app.use(cors());
app.use(express.json());

// 日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// 路由
app.use('/api', imageRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/deduplication', deduplicationRoutes);

// 根路由
app.get('/', (req, res) => {
  res.json({ message: '配料健康扫描API服务正常运行' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(`服务器错误: ${err.message}`);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`服务器运行在 http://localhost:${PORT}`);
}); 