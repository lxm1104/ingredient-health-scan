import mongoose from 'mongoose';
import { getDBStatus } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// 定义单个配料项的结构
const ingredientItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  isHarmful: {
    type: Boolean,
    default: false
  },
  harmfulLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  }
});

// 定义配料表模型的结构
const ingredientSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  ingredientsList: {
    type: String,
    required: true,
    trim: true
  },
  ingredients: [ingredientItemSchema]
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt 字段
});

// 创建配料表模型
const IngredientModel = mongoose.model('Ingredient', ingredientSchema);

// 内存模式的Ingredient类
class MemoryIngredient {
  constructor(data) {
    this._id = uuidv4();
    this.productId = data.productId;
    this.ingredientsList = data.ingredientsList;
    this.ingredients = data.ingredients;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async save() {
    const { inMemoryDB } = getDBStatus();
    inMemoryDB.ingredients.push(this);
    return this;
  }
}

// 工厂函数，根据数据库模式返回对应的模型
const Ingredient = (data) => {
  const { usingMemoryDB } = getDBStatus();
  
  if (usingMemoryDB) {
    return new MemoryIngredient(data);
  } else {
    return new IngredientModel(data);
  }
};

export default Ingredient; 