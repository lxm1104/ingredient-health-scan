# 配料健康扫描后端服务

这是配料健康扫描项目的后端服务，用于分析食品包装图片中的配料表。

## 功能特性

- 接收食品包装图片URL
- 调用VLM模型分析图片内容
- 提取产品信息和配料表
- 存储分析结果到数据库

## 技术栈

- Node.js
- Express.js
- MongoDB
- ModelScope API (Qwen2.5-VL-7B-Instruct模型)

## 快速开始

### 前提条件

- Node.js 18+
- MongoDB

### 安装

1. 克隆仓库
2. 安装依赖
   ```
   cd server
   npm install
   ```
3. 配置环境变量
   ```
   cp src/config/env.example .env
   ```
   编辑`.env`文件，设置必要的环境变量。

### 运行

开发模式：

```
npm run dev
```

生产模式：

```
npm start
```

### 测试

运行单元测试：

```
npm test
```

## API文档

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

## 错误处理

API错误响应格式：

```json
{
  "success": false,
  "message": "错误信息"
}
```

常见HTTP状态码：
- 200: 成功
- 400: 请求错误（缺少参数或参数无效）
- 500: 服务器内部错误 