import mongoose from 'mongoose';
import winston from 'winston';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
});

// 内存数据存储 (用于没有MongoDB时)
const inMemoryDB = {
  products: [],
  ingredients: [],
};

// 是否使用内存数据库
let usingMemoryDB = false;

// 数据库连接
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ingredient-scan';
    await mongoose.connect(uri);
    logger.info('MongoDB 连接成功');
    usingMemoryDB = false;
  } catch (error) {
    logger.warn(`MongoDB 连接失败: ${error.message}，将使用内存数据库`);
    usingMemoryDB = true;
  }
};

// 获取数据库状态
const getDBStatus = () => {
  return {
    usingMemoryDB,
    inMemoryDB
  };
};

export { connectDB, logger, getDBStatus }; 