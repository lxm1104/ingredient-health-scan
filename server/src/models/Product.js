import mongoose from 'mongoose';
import { getDBStatus } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// 定义产品信息模型的结构
const productSchema = new mongoose.Schema({
  brand: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  productType: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt 字段
});

// 创建产品信息模型
const ProductModel = mongoose.model('Product', productSchema);

// 内存模式的Product类
class MemoryProduct {
  constructor(data) {
    this._id = uuidv4();
    this.brand = data.brand;
    this.name = data.name;
    this.productType = data.productType;
    this.imageUrl = data.imageUrl;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async save() {
    const { inMemoryDB } = getDBStatus();
    inMemoryDB.products.push(this);
    return this;
  }
}

// 工厂函数，根据数据库模式返回对应的模型
const Product = (data) => {
  const { usingMemoryDB } = getDBStatus();
  
  if (usingMemoryDB) {
    return new MemoryProduct(data);
  } else {
    return new ProductModel(data);
  }
};

export default Product; 