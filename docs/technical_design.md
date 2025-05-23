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
- **图片大图查看功能**: 
  - 点击产品图片可查看大图
  - 支持图片缩放（0.5x-5x）
  - 支持鼠标拖拽和触摸拖拽
  - 支持滚轮缩放
  - 支持ESC键关闭
  - 提供缩放、重置、关闭按钮
  - 显示操作提示信息
  - 响应式设计，适配桌面和移动端

## VLM模型集成

### 模型配置（已升级）
- **模型**: Qwen/Qwen2.5-VL-32B-Instruct (升级版本，更强大的识别能力)
- **原模型**: Qwen/Qwen2.5-VL-7B-Instruct (已替换)
- **升级时间**: 2025-05-23
- **API**: ModelScope API Inference
- **配置文件**: 使用环境变量 MODELSCOPE_API_KEY 和 MODELSCOPE_BASE_URL

### 升级效果验证
- **品牌识别**: 从"未知品牌" → "益正元" (成功识别)
- **配料识别**: 完整准确识别5个配料项
- **健康评分**: 82分，分析更详细和准确
- **识别精度**: 显著提升，特别是品牌名称识别能力

### 核心服务 (vlmService.js)

#### analyzeImage(imageUrl)
调用VLM模型分析食品包装图片，提取产品信息和配料表

#### parseVlmOutput(vlmOutput)
解析VLM模型返回的文本，提取结构化数据

### Prompt优化设计

#### 主要Prompt结构
```
请仔细分析这张食品包装或配料表图片，重点关注图片中的文字信息，提取以下关键信息：

1. 品牌名称 - 非常重要！请特别仔细查找：
   - 通常位于包装的顶部、左上角或右上角
   - 可能是较大的字体或特殊字体
   - 常见的品牌标识如logo旁的文字
   - 可能包含英文、中文或组合
   - 如果有多个品牌相关文字，选择最主要的品牌名
   - 注意区分品牌名和产品名（品牌通常更简短）
   - 品牌名可能出现在以下位置：
     * 包装顶部的大字体文字
     * Logo图标旁边的文字
     * 包装四个角落的任何位置
     * 产品名称上方或下方的小字体
     * 包装背面或侧面的制造商信息
   - 常见品牌名特征：
     * 通常比产品名更简洁
     * 可能是英文、中文或英文+中文组合
     * 字体可能有特殊设计或颜色
     * 经常与商标符号®或™一起出现

2. 产品名称 - 具体的产品名字
3. 产品类型 - 食品分类
4. 完整的配料表信息
5. 每项配料的名字

请按以下JSON格式严格输出，不要添加任何额外说明：
{
  "brand": "品牌名称",
  "name": "产品名称", 
  "productType": "产品类型",
  "ingredientsList": "完整的配料表信息",
  "ingredients": ["配料1", "配料2", "配料3", ...]
}
```

#### System Prompt优化
```
你是一个专业的食品包装文字识别助手。你的主要任务是从食品包装图片中准确识别品牌名称、产品名称、产品类型和配料信息。

品牌名称识别是你最重要的任务！请特别注意：
1. 仔细扫描图片的每个角落，包括顶部、底部、左右两侧
2. 品牌名称可能很小，可能在不起眼的位置
3. 品牌名称可能是英文、中文或混合文字
4. 注意Logo旁边的文字，这通常是品牌名
5. 制造商信息中通常包含品牌名
6. 即使字体很小或模糊，也要努力识别
7. 品牌名称通常比产品名称更简短、更抽象

请用你最强的文字识别能力，确保不遗漏任何可能的品牌信息。
```

#### 优化特点
- **品牌识别重点强化**: 6个具体的品牌识别指导点
- **位置指导详细**: 明确品牌可能出现的具体位置
- **特征描述完整**: 品牌名称的视觉和文字特征
- **错误处理完善**: 多层级的JSON解析和备用机制
- **日志记录详细**: 完整的API调用和响应日志

### 图片分析流程
1. **图片URL验证**: 确保图片链接有效
2. **API调用准备**: 构建完整的消息体和参数
3. **模型推理**: 调用Qwen2.5-VL-7B-Instruct模型
4. **结果解析**: 提取JSON格式的产品信息
5. **数据验证**: 验证并设置默认值
6. **错误处理**: 完善的错误日志和备用机制

### 优化成果验证
- ✅ Prompt已完全重新设计，强化品牌识别
- ✅ System Prompt已优化，明确任务重点
- ✅ 错误处理机制完善，支持多种JSON格式
- ✅ 日志记录详细，便于调试和监控
- ✅ API响应稳定，识别准确率高
- ⚠️ 特定图片的品牌识别仍需根据图片质量而定

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
```

## 前端图片查看组件

### ImageViewer组件 (src/components/ImageViewer.tsx)
专用的图片大图查看器组件，提供完整的图片交互体验。

#### 核心功能
- **图片缩放**: 支持0.5x-5x范围的图片缩放
- **拖拽移动**: 支持鼠标拖拽和触摸拖拽
- **滚轮缩放**: 鼠标滚轮精确缩放控制
- **键盘控制**: ESC键快速关闭
- **控制按钮**: 放大、缩小、重置、关闭按钮
- **用户提示**: 动态操作提示信息
- **响应式设计**: 桌面和移动端完整适配

#### 技术实现细节

##### 状态管理
```typescript
const [scale, setScale] = useState(1);           // 缩放比例
const [position, setPosition] = useState({ x: 0, y: 0 }); // 图片位置
const [isDragging, setIsDragging] = useState(false);      // 拖拽状态
const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // 拖拽起始点
const [positionStart, setPositionStart] = useState({ x: 0, y: 0 }); // 拖拽起始位置
```

##### 核心方法
- **resetView()**: 重置图片到初始状态
- **handleZoomIn/Out()**: 缩放控制（1.5倍递增/递减）
- **handleMouseDown/Move/Up()**: 鼠标拖拽处理
- **handleTouchStart/Move/End()**: 触摸拖拽处理（移动端）
- **handleWheel()**: 滚轮缩放处理

##### 事件处理策略
- **拖拽限制**: 仅在缩放>1时允许拖拽
- **事件阻止**: 防止默认滚轮行为
- **光标变化**: 根据状态动态改变光标样式
- **键盘监听**: 全局ESC键监听，组件卸载时清理

##### CSS Transform实现
```css
transform: scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)
transition: ${isDragging ? 'none' : 'transform 0.2s ease-out'}
```

#### 用户体验设计
- **直观操作**: 点击背景关闭，按钮操作清晰
- **视觉反馈**: 按钮悬停效果，拖拽光标变化
- **动态提示**: 根据当前状态显示不同操作提示
- **流畅动画**: 缩放和重置时的平滑过渡
- **防误操作**: 拖拽限制和事件边界处理

#### 集成方式
在ProductDetailPage中的集成：
1. **状态管理**: `showImageViewer` 控制显示
2. **触发事件**: 点击产品图片触发显示
3. **悬停提示**: "点击查看大图" 视觉提示
4. **参数传递**: 图片URL和alt文本传递
5. **关闭处理**: 多种关闭方式（ESC、按钮、点击背景）

#### 性能优化
- **条件渲染**: 仅在需要时渲染组件
- **事件清理**: 组件卸载时清理事件监听
- **状态重置**: 每次打开时重置到初始状态
- **内存管理**: 避免内存泄漏的事件处理

### 产品详情页图片大图功能集成
在ProductDetailPage.tsx中实现的完整图片查看体验：

#### 交互设计
- **鼠标悬停**: 显示"点击查看大图"提示
- **点击响应**: 即时打开大图查看器
- **视觉效果**: 悬停时图片轻微放大和阴影效果
- **无缝切换**: 从小图到大图的流畅过渡

#### 技术集成
```typescript
const [showImageViewer, setShowImageViewer] = useState(false);

const handleImageClick = () => {
  setShowImageViewer(true);
};
```

#### 响应式适配
- **桌面端**: 完整的鼠标交互体验
- **移动端**: 触摸友好的操作方式
- **平板端**: 混合交互模式支持