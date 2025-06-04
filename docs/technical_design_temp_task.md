# 配料健康扫描项目微信小程序部署技术设计

## 1. 技术架构转换设计

### 1.1 现有架构分析
```
Web版架构：
前端: React + TypeScript + Vite + Tailwind CSS + Shadcn UI
后端: Node.js + Express + MongoDB + ModelScope VLM API
部署: 分离式部署，前后端独立
```

### 1.2 小程序架构设计
```
小程序版架构：
前端: Taro + React + TypeScript + Taro UI
后端: 保持现有Node.js + Express + MongoDB (需要HTTPS配置)
部署: 前端发布到微信小程序平台，后端需要配置域名白名单
```

## 2. Taro框架选择理由

### 2.1 技术优势
- **语法相似性**: 使用React语法，与现有代码高度兼容
- **TypeScript支持**: 完全支持TypeScript，保持类型安全
- **组件复用**: 可以复用部分业务逻辑组件
- **多端适配**: 支持微信、支付宝、百度等多个小程序平台

### 2.2 迁移成本分析
- **低成本迁移项**: API服务层、工具函数、业务逻辑
- **中等成本迁移项**: 页面结构、路由配置
- **高成本重写项**: UI组件(Shadcn UI → Taro UI)、样式系统(Tailwind → 小程序样式)

## 3. 核心功能适配设计

### 3.1 图片上传功能适配
```typescript
// 现有Web版本
const handleFileUpload = (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  // 发送到后端
}

// 小程序Taro版本适配
import Taro from '@tarojs/taro';

const handleImageUpload = async () => {
  try {
    const res = await Taro.chooseImage({
      count: 1,
      sizeType: ['compressed', 'original'],
      sourceType: ['album', 'camera']
    });
    
    const tempFilePath = res.tempFilePaths[0];
    
    // 上传到服务器
    const uploadRes = await Taro.uploadFile({
      url: 'https://your-domain.com/api/analyze-image',
      filePath: tempFilePath,
      name: 'image',
      header: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return JSON.parse(uploadRes.data);
  } catch (error) {
    console.error('图片上传失败:', error);
  }
}
```

### 3.2 网络请求适配
```typescript
// API服务层适配
import Taro from '@tarojs/taro';

class ApiService {
  private baseURL = 'https://your-domain.com/api';

  async request<T>(options: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
  }): Promise<T> {
    try {
      const response = await Taro.request({
        url: `${this.baseURL}${options.url}`,
        method: options.method || 'GET',
        data: options.data,
        header: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }

  // 分析图片 (保持与现有API兼容)
  async analyzeImage(imageUrl: string) {
    return this.request({
      url: '/analyze-image',
      method: 'POST',
      data: { imageUrl }
    });
  }

  // 获取推荐产品
  async getRecommendations() {
    return this.request({
      url: '/recommendations',
      method: 'GET'
    });
  }
}
```

### 3.3 路由系统适配
```typescript
// app.config.ts
export default defineAppConfig({
  pages: [
    'pages/scan/index',           // 扫描页面 (默认页面)
    'pages/recommendations/index', // 推荐页面
    'pages/product/index'         // 产品详情页
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '配料健康扫描',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#666',
    selectedColor: '#1890ff',
    backgroundColor: '#fafafa',
    list: [
      {
        pagePath: 'pages/scan/index',
        text: '查配料',
        iconPath: 'assets/icons/scan.png',
        selectedIconPath: 'assets/icons/scan-active.png'
      },
      {
        pagePath: 'pages/recommendations/index',
        text: '推荐',
        iconPath: 'assets/icons/recommend.png',
        selectedIconPath: 'assets/icons/recommend-active.png'
      }
    ]
  }
});
```

## 4. UI组件迁移策略

### 4.1 组件映射关系
```typescript
// Web版 Shadcn UI → 小程序 Taro UI 映射
Web版组件              小程序组件             迁移策略
Button                 AtButton              直接替换
Card                   AtCard                样式适配
Input                  AtInput               功能对等
Loading                AtActivityIndicator   功能对等
Dialog                 AtModal               API适配
Toast                  Taro.showToast        原生API
```

### 4.2 自定义组件设计
```typescript
// 产品卡片组件适配
import { View, Image, Text } from '@tarojs/components';
import { AtCard, AtTag } from 'taro-ui';

interface ProductCardProps {
  product: {
    id: string;
    brand: string;
    name: string;
    productType: string;
    imageUrl: string;
    healthScore: number;
    healthLevel: string;
  };
  onTap?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onTap }) => {
  return (
    <AtCard
      className="product-card"
      title={`${product.brand} ${product.name}`}
      thumb={product.imageUrl}
      onClick={onTap}
    >
      <View className="product-info">
        <View className="product-type">
          <AtTag size="small" type="primary">{product.productType}</AtTag>
        </View>
        <View className="health-score">
          <Text className="score-label">健康评分：</Text>
          <Text className={`score-value ${product.healthLevel}`}>
            {product.healthScore}分
          </Text>
          <AtTag 
            size="small" 
            type={product.healthScore >= 80 ? 'primary' : 'secondary'}
          >
            {product.healthLevel}
          </AtTag>
        </View>
      </View>
    </AtCard>
  );
};

export default ProductCard;
```

## 5. 样式系统迁移

### 5.1 Tailwind CSS → 小程序样式
```scss
// 小程序样式适配方案
// styles/common.scss

// 颜色变量 (保持与Web版一致)
$primary-color: #1890ff;
$success-color: #52c41a;
$warning-color: #faad14;
$error-color: #f5222d;

// 间距变量
$spacing-xs: 8px;
$spacing-sm: 12px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;

// 公共样式类
.container {
  padding: $spacing-md;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

// 健康评分样式
.health-score {
  .score-value {
    font-weight: bold;
    font-size: 18px;
    
    &.优秀 { color: $success-color; }
    &.良好 { color: $primary-color; }
    &.一般 { color: $warning-color; }
    &.较差 { color: $error-color; }
  }
}
```

## 6. 后端API适配要求

### 6.1 HTTPS配置要求
```javascript
// 小程序要求所有网络请求必须使用HTTPS
// 需要配置SSL证书

// server/app.js 修改示例
const https = require('https');
const fs = require('fs');

// SSL证书配置
const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

// 创建HTTPS服务器
const server = https.createServer(options, app);
server.listen(443, () => {
  console.log('HTTPS服务器运行在端口443');
});
```

### 6.2 CORS策略调整
```javascript
// 需要配置允许小程序域名的CORS策略
app.use(cors({
  origin: [
    'https://servicewechat.com',  // 微信小程序域名
    'https://your-domain.com'     // 自定义域名
  ],
  credentials: true
}));
```

### 6.3 文件上传接口适配
```javascript
// 适配小程序的文件上传格式
app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  try {
    let imageData;
    
    // 处理文件上传
    if (req.file) {
      imageData = req.file;
    }
    // 处理URL输入
    else if (req.body.imageUrl) {
      imageData = { url: req.body.imageUrl };
    }
    
    // 调用现有的图片分析逻辑
    const result = await analyzeImageService(imageData);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

## 7. 性能优化策略

### 7.1 小程序包体积优化
```javascript
// config/index.js Taro配置
const config = {
  mini: {
    // 启用代码分包
    subPackages: [
      {
        root: 'pages/product',
        pages: ['index']
      }
    ],
    
    // 图片压缩
    imageUrlLoaderOption: {
      limit: 8192,
      name: 'static/images/[name].[hash:8].[ext]'
    },
    
    // CSS压缩
    cssLoaderOption: {
      localIdentName: '[hash:base64:5]'
    }
  }
};
```

### 7.2 请求缓存策略
```typescript
// 实现简单的请求缓存
class CacheService {
  private cache = new Map();
  private readonly CACHE_TIME = 5 * 60 * 1000; // 5分钟

  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TIME) {
      return cached.data;
    }
    
    const data = await fetcher();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
  
  clear() {
    this.cache.clear();
  }
}
```

## 8. 小程序特色功能集成

### 8.1 微信分享功能
```typescript
// 页面分享配置
useShareAppMessage(() => {
  return {
    title: '发现一个很棒的配料健康扫描工具',
    path: '/pages/scan/index',
    imageUrl: '/assets/share-image.jpg'
  };
});

// 分享到朋友圈
useShareTimeline(() => {
  return {
    title: '配料健康扫描 - 了解食品真相',
    query: 'from=timeline'
  };
});
```

### 8.2 小程序码生成
```javascript
// 后端生成小程序码API
app.post('/api/generate-qrcode', async (req, res) => {
  try {
    const { productId } = req.body;
    
    // 调用微信API生成小程序码
    const qrcodeBuffer = await generateMiniProgramCode({
      page: 'pages/product/index',
      scene: `productId=${productId}`
    });
    
    res.json({
      success: true,
      qrcode: qrcodeBuffer.toString('base64')
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

## 9. 开发和部署流程

### 9.1 开发环境搭建
```bash
# 1. 安装Taro CLI
npm install -g @tarojs/cli

# 2. 创建项目
taro init ingredient-scan-miniprogram --typescript

# 3. 安装依赖
cd ingredient-scan-miniprogram
npm install

# 4. 安装UI库和工具
npm install taro-ui
npm install @tarojs/plugin-mock

# 5. 配置开发环境
npm run dev:weapp
```

### 9.2 部署配置
```javascript
// project.config.json
{
  "appid": "your-miniprogram-appid",
  "projectname": "ingredient-scan-miniprogram",
  "setting": {
    "urlCheck": true,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true
  },
  "compileType": "miniprogram",
  "libVersion": "latest",
  "condition": {}
}
```

## 10. 测试策略

### 10.1 单元测试适配
```typescript
// 保持现有的测试用例，适配Taro环境
import { render, screen } from '@testing-library/react';
import { ProductCard } from '../components/ProductCard';

describe('ProductCard Component', () => {
  it('should render product information correctly', () => {
    const mockProduct = {
      id: '1',
      brand: '乐事',
      name: '原味薯片',
      productType: '膨化食品',
      imageUrl: 'test.jpg',
      healthScore: 85,
      healthLevel: '良好'
    };
    
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText('乐事 原味薯片')).toBeInTheDocument();
    expect(screen.getByText('85分')).toBeInTheDocument();
  });
});
```

### 10.2 E2E测试策略
```typescript
// 使用小程序测试框架进行端到端测试
describe('Ingredient Scan E2E', () => {
  it('should complete image upload and analysis flow', async () => {
    // 1. 进入扫描页面
    await page.goto('/pages/scan/index');
    
    // 2. 点击上传图片
    await page.click('#upload-button');
    
    // 3. 选择测试图片
    await page.chooseImage({ count: 1 });
    
    // 4. 等待分析结果
    await page.waitForSelector('.analysis-result');
    
    // 5. 验证结果显示
    const result = await page.$('.product-info');
    expect(result).toBeTruthy();
  });
});
```

这个技术设计文档涵盖了将现有Web应用迁移到微信小程序的所有关键技术要点。接下来我们可以开始具体的实施工作。 