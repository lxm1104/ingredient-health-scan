# 配料健康扫描项目技术设计

## 项目概述
配料健康扫描是一个允许用户通过上传食品包装图片或输入图片链接来分析食品配料表的应用程序。系统会自动识别图片中的产品信息和配料表，并将这些信息保存到数据库中，以便后续分析食品的健康程度。同时提供基于数据库产品的健康推荐功能和同类产品推荐。

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
- 统一的扫描页面支持图片上传和URL输入两种方式

### 后端架构
- 基于Express.js的RESTful API
- 使用MongoDB作为数据存储
- 使用Mongoose进行数据模型定义和数据库操作
- 集成ModelScope的VLM模型进行图片分析
- 推荐系统基于数据库产品数据生成健康评分
- 产品类型简化服务提供用户友好的分类

### 数据流
1. 用户提供食品包装图片（上传文件或URL）
2. 前端发送图片到后端API
3. 后端调用VLM模型分析图片
4. VLM模型返回识别结果
5. 后端解析结果并存储到数据库
6. 应用产品类型简化规则
7. 获取同类健康产品推荐
8. 返回处理结果给前端
9. 前端展示产品信息、配料分析和推荐产品

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

## 核心服务设计

### 产品类型简化服务 (productTypeService.js)
将复杂的技术性产品类型转换为用户友好的日常描述：

#### 主要功能
- **simplifyProductType(originalType)**: 单个产品类型转换
- **simplifyProductTypes(products)**: 批量产品类型转换
- **getSimplifiedProductTypes()**: 获取所有简化类型列表

#### 映射规则示例
```javascript
{
  '烘烤类糕点': '饼干',
  '热风干燥方便食品': '方便面',
  '高盐稀态发酵酱油': '酱油',
  '(Ⅱ类·其他型)速溶豆粉': '豆制品',
  // ... 70+ 种映射规则
}
```

#### 匹配策略
1. **直接匹配**: 精确匹配映射表中的键值
2. **模糊匹配**: 包含关键词的部分匹配
3. **特殊规则**: 基于关键词的智能分类
4. **备份机制**: 保留原始类型作为 originalProductType

### 健康评分服务 (healthScoreService.js)
基于产品名称生成一致的健康评分：

#### 评分算法
- 使用哈希算法确保同一产品始终有相同评分
- 评分范围：60-95分
- 分级标准：
  - 90-95分：优质健康产品
  - 80-89分：健康水平良好
  - 70-79分：营养成分一般
  - 60-69分：建议谨慎选择

## API设计

### 图片分析API
- **端点**: POST /api/analyze-image
- **支持格式**: 
  - FormData (文件上传)
  - JSON (URL输入)
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

#### 获取产品类型（简化后）
- **端点**: GET /recommendations/categories
- **响应**:
  ```json
  {
    "success": true,
    "data": {
      "categories": ["全部", "饼干", "方便面", "膨化食品", "饮料"]
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
          "category": "饼干",
          "originalCategory": "糕点/饼干",
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

#### 获取同类推荐产品
- **端点**: GET /recommendations/similar
- **查询参数**:
  - `productType` (必需): 产品类型
  - `excludeId` (可选): 要排除的产品ID
  - `limit` (可选): 返回数量限制，默认5
- **响应**:
  ```json
  {
    "success": true,
    "data": {
      "products": [
        {
          "id": "60d21b4667d0d8992e610c86",
          "name": "健康薯片",
          "brand": "健康品牌",
          "category": "膨化食品",
          "image": "https://example.com/image2.jpg",
          "healthScore": 88,
          "healthLevel": "良好"
        }
      ],
      "targetType": "膨化食品",
      "total": 1
    }
  }
  ```

#### 获取产品详细信息
- **端点**: GET /recommendations/product/:id
- **路径参数**:
  - `id` (必需): 产品ID
- **响应**:
  ```json
  {
    "success": true,
    "data": {
      "product": {
        "id": "682fe18e970de85640aa6f13",
        "name": "原味豆浆粉",
        "brand": "未知品牌",
        "category": "豆制品",
        "originalCategory": "(Ⅱ类·其他型)速溶豆粉",
        "image": "https://qcloud.dpfile.com/pc/xxx.jpg",
        "createdAt": "2025-05-23T02:46:38.765Z",
        "updatedAt": "2025-05-23T02:46:38.765Z",
        "healthScore": 85,
        "healthLevel": "良好",
        "healthAnalysis": "配料表仅含非转基因大豆，无添加剂",
        "ingredients": {
          "id": "682fe18e970de85640aa6f15",
          "ingredientsList": "<添加量:大豆(非转基因)>≥36g/100g",
          "ingredients": [
            {
              "name": "<添加量:大豆(非转基因)>≥36g/100g",
              "isHarmful": false,
              "harmfulLevel": 0
            }
          ],
          "mainIssues": ["大豆含量未达原料占比最高（36%）"],
          "goodPoints": ["零添加防腐剂/香精/色素", "使用非转基因大豆原料"],
          "createdAt": "2025-05-23T02:46:38.771Z",
          "updatedAt": "2025-05-23T02:46:55.367Z",
          "scoreAnalyzedAt": "2025-05-23T02:46:55.366Z"
        }
      }
    }
  }
  ```

## 推荐系统设计

### 健康评分算法
- 基于产品名称生成一致的健康评分（60-95分）
- 使用哈希算法确保同一产品始终有相同评分
- 评分范围：60-95分，分为四个等级：
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

### 同类推荐算法
- 基于简化后的产品类型进行匹配
- 排除当前分析的产品
- 按健康评分从高到低排序
- 支持限制返回数量

### 筛选和排序功能
- 支持按简化后的产品类型筛选
- 支持按健康评分排序（从高到低）
- 支持限制返回数量

## 前端页面架构

### ScanPage (统一扫描页面)
- **输入模式切换**: 支持图片上传和URL输入
- **图片上传**: 支持拖拽和点击上传
- **URL输入**: 支持图片链接输入和预览
- **分析结果展示**: 
  - 产品信息卡片
  - 健康评分圆形指示器
  - 健康分析详情（亮点和注意事项）
  - 配料表完整信息
  - 配料成分风险标签
- **同类推荐**: 推荐产品网格展示
- **错误处理**: 完善的错误提示和重试机制

### RecommendationsPage
- 产品类型筛选（使用简化后的类型）
- 健康评分排序
- 产品网格展示
- **产品卡片点击**: 支持点击跳转到产品详情页
- **交互反馈**: 鼠标悬停阴影效果和光标变化
- 分页功能

### HomePage
- 功能介绍
- 快速入口

### ProductDetailPage
- **产品详细信息展示**: 完整的产品信息、图片、品牌、类型等
- **健康评分详情**: 彩色圆形评分指示器、健康等级标签、健康分析文字
- **配料表分析**: 
  - 完整配料表展示
  - 配料成分分析标签（风险等级标识）
  - 健康亮点列表（绿色展示）
  - 注意事项列表（橙色警告）
- **产品信息详情**: 添加时间、原始分类信息
- **导航功能**: 返回按钮（支持浏览器历史回退）
- **错误处理**: 产品不存在、加载失败的友好提示
- **响应式设计**: 支持桌面端和移动端适配
- **路由集成**: 通过 `/product/:id` 路径访问
- **数据获取**: 调用产品详情API获取完整信息

## VLM模型集成
系统使用ModelScope的Qwen2.5-VL-7B-Instruct模型进行图片分析。该模型将接收图片URL和提示文本，返回图片中识别到的产品信息和配料表。

### 模型调用流程
1. 构建请求消息，包含文本提示和图片URL
2. 调用ModelScope API
3. 解析模型返回的结果
4. 提取产品信息和配料表
5. 应用产品类型简化规则
6. 将信息保存到数据库
7. 获取同类推荐产品

## 错误处理与日志记录
- 使用winston进行日志记录
- 所有API错误将返回标准错误响应
- 日志将保存在logs/app.log文件中
- 前端提供用户友好的错误提示

## 测试策略
- 使用Jest进行单元测试
- 使用Supertest进行API集成测试
- 模拟VLM模型响应进行测试
- 推荐API的单元测试和集成测试
- 产品类型简化服务的单元测试

## 文件结构
```
project/
├── src/                          # 前端源码
│   ├── pages/
│   │   ├── ScanPage.tsx         # 统一扫描页面
│   │   ├── RecommendationsPage.tsx  # 推荐产品页面
│   │   ├── ProductDetailPage.tsx    # 产品详情页面
│   │   └── HomePage.tsx
│   ├── services/
│   │   └── recommendationService.ts # 推荐API服务（含产品详情）
│   ├── components/              # 共用组件
│   └── lib/                     # 工具函数
├── server/                      # 后端源码
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── imageController.js
│   │   │   └── recommendationController.js  # 含产品详情控制器
│   │   ├── services/
│   │   │   ├── vlmService.js
│   │   │   ├── healthScoreService.js
│   │   │   └── productTypeService.js    # 产品类型简化服务
│   │   ├── models/
│   │   │   ├── Product.js
│   │   │   └── Ingredient.js
│   │   ├── routes/
│   │   │   ├── imageRoutes.js
│   │   │   └── recommendationRoutes.js   # 含产品详情路由
│   │   └── config/
│   └── tests/                   # 测试文件
├── docs/                        # 文档
│   └── technical_design.md
└── logs/                        # 日志文件
    └── app.log
```

## 部署架构
- 前端：Vite构建，支持静态部署
- 后端：Node.js Express服务
- 数据库：MongoDB
- 日志：文件系统日志
- API：RESTful接口设计

## 性能优化
- 图片上传支持多种格式
- API响应缓存
- 数据库查询优化
- 前端组件懒加载
- 错误边界处理

## 安全考虑
- 图片上传文件类型验证
- URL输入格式验证
- API请求频率限制
- 错误信息脱敏
- 数据库查询防注入

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