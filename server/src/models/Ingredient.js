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
  ingredients: [ingredientItemSchema],
  // 健康评分相关字段
  healthScore: {
    type: Number,
    min: 60,
    max: 95,
    default: null // 初始为null，分析后更新
  },
  healthLevel: {
    type: String,
    enum: ['优秀', '良好', '一般', '较差'],
    default: null
  },
  healthAnalysis: {
    type: String,
    default: null // 健康分析说明
  },
  mainIssues: [{
    type: String
  }], // 主要健康问题列表
  goodPoints: [{
    type: String
  }], // 健康亮点列表
  scoreAnalyzedAt: {
    type: Date,
    default: null // 健康评分分析时间
  }
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
    // 健康评分字段
    this.healthScore = data.healthScore || null;
    this.healthLevel = data.healthLevel || null;
    this.healthAnalysis = data.healthAnalysis || null;
    this.mainIssues = data.mainIssues || [];
    this.goodPoints = data.goodPoints || [];
    this.scoreAnalyzedAt = data.scoreAnalyzedAt || null;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async save() {
    const { inMemoryDB } = getDBStatus();
    inMemoryDB.ingredients.push(this);
    return this;
  }

  // 更新健康评分信息
  updateHealthScore(scoreData) {
    this.healthScore = scoreData.healthScore;
    this.healthLevel = scoreData.healthLevel;
    this.healthAnalysis = scoreData.analysis;
    this.mainIssues = scoreData.mainIssues || [];
    this.goodPoints = scoreData.goodPoints || [];
    this.scoreAnalyzedAt = new Date();
    this.updatedAt = new Date();
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