# 配料健康扫描项目技术设计

## 项目概述
配料健康扫描是一个允许用户通过上传食品包装图片来分析食品配料表的应用程序。系统会自动识别图片中的产品信息和配料表，并将这些信息保存到数据库中，以便后续分析食品的健康程度。

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
  updatedAt: Date        // 更新时间
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
        ]
      }
    }
  }
  ```

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