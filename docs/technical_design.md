# 配料健康扫描项目技术设计

## 项目概述
配料健康扫描是一个允许用户通过上传食品包装图片来分析食品配料表的应用程序。系统会自动识别图片中的产品信息和配料表，并将这些信息保存到数据库中，以便后续分析食品的健康程度。同时提供基于数据库产品的健康推荐功能。

## 技术栈
- **前端**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI
- **后端**: Node.js, Express.js
- **数据库**: MongoDB
- **AI模型**: Qwen2.5-VL-7B-Instruct (通过ModelScope API)
- **测试**: Jest

## 系统架构

### 前端架构
- 基于React的单页应用
- 使用React Router进行路由管理
- 使用Shadcn UI组件库构建用户界面
- 使用React Query处理API请求

### 后端架构
- 基于Express.js的RESTful API
- 使用MongoDB作为数据存储
- 使用Mongoose进行数据模型定义和数据库操作
- 集成ModelScope的VLM模型进行图片分析
- 推荐系统基于数据库产品数据生成健康评分

### 数据流
1. 用户提供食品包装图片URL
2. 前端发送图片URL到后端API
3. 后端调用VLM模型分析图片
4. VLM模型返回识别结果
5. 后端解析结果并存储到数据库
6. 返回处理结果给前端
7. 前端展示产品信息和配料分析

## 数据模型设计

### Product 模型
```javascript
{
  brand: String,         // 品牌名称，例如"乐事"
  name: String,          // 产品名称，例如"原味薯片"
  productType: String,   // 产品类型，例如"膨化食品"
  imageUrl: String,      // 产品图片URL
  createdAt: Date,       // 创建时间
  updatedAt: Date        // 更新时间
}
```

### Ingredient 模型
```javascript
{
  productId: ObjectId,   // 关联到Product的ID
  ingredientsList: String, // 完整的配料表文本
  ingredients: [{
    name: String,        // 配料名称
    isHarmful: Boolean,  // 是否有害（后续功能）
    harmfulLevel: Number // 有害程度（后续功能）
  }],
  createdAt: Date,       // 创建时间
  updatedAt: Date,       // 更新时间
  healthScore: Number,   // 健康评分 (60-95)
  healthLevel: String,   // 健康等级 (优秀/良好/一般/较差)
  healthAnalysis: String,// 健康分析说明
  mainIssues: [String],  // 主要健康问题列表
  goodPoints: [String],  // 健康亮点列表
  scoreAnalyzedAt: Date  // 健康评分分析时间
}
```

## API设计

### 图片分析API
- **端点**: POST /api/analyze-image
- **请求体**:
  ```json
  {
    "imageUrl": "https://example.com/image.jpg"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "data": {
      "product": {
        "id": "60d21b4667d0d8992e610c85",
        "brand": "乐事",
        "name": "原味薯片",
        "productType": "膨化食品",
        "imageUrl": "https://example.com/image.jpg"
      },
      "ingredients": {
        "id": "60d21b4667d0d8992e610c86",
        "ingredientsList": "马铃薯、植物油、食盐...",
        "ingredients": [
          {"name": "马铃薯", "isHarmful": false, "harmfulLevel": 0},
          {"name": "植物油", "isHarmful": false, "harmfulLevel": 0},
          {"name": "食盐", "isHarmful": false, "harmfulLevel": 0}
        ],
        "healthScore": 85,
        "healthLevel": "良好",
        "healthAnalysis": "整体健康水平良好，适合日常消费",
        "mainIssues": ["含有少量食品添加剂"],
        "goodPoints": ["主要成分为天然食材"],
        "scoreAnalyzedAt": "2025-05-23T02:36:03.651Z"
      }
    }
  }
  ```

### 推荐系统API

#### 获取产品类型
- **端点**: GET /recommendations/categories
- **响应**:
  ```json
  {
    "success": true,
    "data": {
      "categories": ["全部", "烘烤类糕点", "热风干燥方便食品", "糕点/饼干"]
    }
  }
  ```

#### 获取推荐产品列表
- **端点**: GET /recommendations/products
- **查询参数**:
  - `category` (可选): 产品类别筛选，默认"全部"
  - `sortBy` (可选): 排序方式，默认"healthScore"
  - `limit` (可选): 返回数量限制，默认50
- **响应**:
  ```json
  {
    "success": true,
    "data": {
      "products": [
        {
          "id": "60d21b4667d0d8992e610c85",
          "name": "法式浪漫礼",
          "brand": "解析失败-未知品牌",
          "category": "糕点/饼干",
          "image": "https://example.com/image.jpg",
          "healthScore": 81,
          "description": "法式浪漫礼整体健康水平良好，适合日常消费，推荐适量食用。"
        }
      ],
      "total": 6,
      "category": "全部",
      "sortBy": "healthScore"
    }
  }
  ```

## 推荐系统设计

### 健康评分算法
- 基于产品名称生成一致的健康评分（60-95分）
- 使用哈希算法确保同一产品始终有相同评分
- 评分范围：60-95分，分为三个等级：
  - 90-95分：优质健康产品
  - 80-89分：健康水平良好
  - 70-79分：营养成分一般
  - 60-69分：建议谨慎选择

### 推荐描述生成
根据健康评分自动生成推荐描述：
- 90+分：强烈推荐，成分天然营养丰富
- 80-89分：推荐适量食用，健康水平良好
- 70-79分：建议适量食用，注意均衡饮食
- 60-69分：建议谨慎选择，寻找更健康替代品

### 筛选和排序功能
- 支持按产品类型筛选
- 支持按健康评分排序（从高到低）
- 支持限制返回数量

## VLM模型集成
系统将使用ModelScope的Qwen2.5-VL-7B-Instruct模型进行图片分析。该模型将接收图片URL和提示文本，返回图片中识别到的产品信息和配料表。

### 模型调用流程
1. 构建请求消息，包含文本提示和图片URL
2. 调用ModelScope API
3. 解析模型返回的结果
4. 提取产品信息和配料表
5. 将信息保存到数据库

## 错误处理与日志记录
- 使用winston进行日志记录
- 所有API错误将返回标准错误响应
- 日志将保存在logs/app.log文件中

## 测试策略
- 使用Jest进行单元测试
- 使用Supertest进行API集成测试
- 模拟VLM模型响应进行测试
- 推荐API的单元测试和集成测试

## 文件结构

### 后端文件
- `src/controllers/recommendationController.js` - 推荐功能控制器
- `src/routes/recommendationRoutes.js` - 推荐功能路由
- `src/controllers/imageAnalysisController.js` - 图片分析控制器
- `src/models/Product.js` - 产品数据模型
- `src/models/Ingredient.js` - 配料数据模型

### 前端文件
- `src/pages/RecommendationsPage.tsx` - 推荐页面组件
- `src/services/recommendationService.ts` - 推荐API服务
- `src/pages/ScanPage.tsx` - 扫描页面组件
- `src/pages/HomePage.tsx` - 首页组件

## 健康评分系统设计

### 概述
健康评分系统使用Qwen3-32B模型对产品配料表进行智能分析，根据添加剂含量、天然成分比例等因素给出60-95分的健康评分。

### 评分标准
- **90-95分**：几乎无添加剂，成分天然，营养价值高，非常健康
- **80-89分**：少量无害添加剂，整体健康，适合日常食用
- **70-79分**：含有一些常见添加剂，营养一般，建议适量食用
- **60-69分**：添加剂较多，营养价值低，建议谨慎选择

### 技术架构

#### 健康评分服务 (healthScoreService.js)
```javascript
class HealthScoreService {
  // 使用Qwen3-32B模型进行健康评分分析
  async analyzeHealthScore(ingredientsList, productName, productType)
  
  // 创建专业的健康评分prompt
  createHealthScorePrompt(ingredientsList, productName, productType)
  
  // 解析模型响应，提取健康评分结果
  parseHealthScoreResponse(response)
  
  // 备用评分算法（API失败时使用）
  getDefaultHealthScore(ingredientsList, productName)
}
```

#### 评分分析流程
1. **配料表分析**：提取产品配料表文本
2. **AI模型调用**：发送到Qwen3-32B模型进行专业分析
3. **结果解析**：提取评分、等级、分析说明等信息
4. **数据存储**：将评分结果保存到数据库
5. **备用机制**：API失败时使用关键词分析算法

### 数据模型扩展

#### Ingredient模型新增字段
```javascript
{
  // 原有字段...
  
  // 健康评分相关字段
  healthScore: Number,        // 健康评分 (60-95)
  healthLevel: String,        // 健康等级 (优秀/良好/一般/较差)
  healthAnalysis: String,     // 健康分析说明
  mainIssues: [String],       // 主要健康问题列表
  goodPoints: [String],       // 健康亮点列表
  scoreAnalyzedAt: Date       // 健康评分分析时间
}
```

### API接口扩展

#### 图片分析API响应更新
```json
{
  "success": true,
  "data": {
    "product": { /* 产品信息 */ },
    "ingredients": {
      "id": "ingredient_id",
      "ingredientsList": "配料表文本",
      "ingredients": [/* 配料列表 */],
      "healthScore": 85,
      "healthLevel": "良好",
      "healthAnalysis": "整体健康水平良好，适合日常消费",
      "mainIssues": ["含有少量食品添加剂"],
      "goodPoints": ["主要成分为天然食材"],
      "scoreAnalyzedAt": "2025-05-23T02:36:03.651Z"
    }
  }
}
```

### 批量数据处理

#### 存量数据更新脚本 (updateHealthScores.js)
```bash
# 更新所有缺少健康评分的记录
node scripts/updateHealthScores.js

# 重新分析指定产品
node scripts/updateHealthScores.js reanalyze "产品名称"
```

#### 脚本功能特性
- **批量处理**：自动查找并处理未评分的记录
- **进度跟踪**：显示处理进度和成功率
- **统计分析**：展示评分分布和汇总信息
- **错误处理**：API失败时使用备用算法
- **频率限制**：避免API调用频率过高

### 推荐系统集成

#### 健康评分在推荐中的应用
推荐控制器中的`generateHealthScore`函数已被实际的数据库健康评分替代：

```javascript
// 旧方式：基于产品名称生成假数据
const healthScore = generateHealthScore(product.name);

// 新方式：从数据库获取真实健康评分
const ingredient = await getIngredientByProductId(product._id);
const healthScore = ingredient.healthScore || generateHealthScore(product.name);
```

### 系统文件结构

#### 新增文件
- `src/services/healthScoreService.js` - 健康评分分析服务
- `scripts/updateHealthScores.js` - 存量数据更新脚本

#### 修改文件
- `src/models/Ingredient.js` - 添加健康评分字段
- `src/controllers/imageAnalysisController.js` - 集成健康评分功能
- `src/controllers/recommendationController.js` - 使用真实健康评分数据

### 错误处理和容错机制

#### API调用容错
- **超时设置**：30秒请求超时
- **重试机制**：API失败时使用备用算法
- **频率控制**：批量处理时添加延迟
- **详细日志**：记录所有处理过程和错误信息

#### 备用评分算法
当AI模型API不可用时，系统使用基于关键词的简化算法：
- 检测有害添加剂关键词（防腐剂、色素、香精等）
- 检测天然成分关键词（纯、天然、有机等）
- 基于关键词匹配计算基础评分

### 性能和扩展性

#### 性能优化
- **批量处理**：避免单个请求造成的数据库压力
- **异步处理**：健康评分分析不阻塞主流程
- **缓存机制**：相同配料表避免重复分析
- **索引优化**：healthScore字段建立索引

#### 扩展性考虑
- **模型切换**：支持更换不同的AI分析模型
- **评分算法**：支持多种评分算法并行
- **数据源**：支持从多个数据源获取营养信息
- **实时更新**：支持评分标准的动态调整 