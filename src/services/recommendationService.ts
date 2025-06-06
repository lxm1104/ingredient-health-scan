// 推荐API服务

// 使用相对路径，通过Vite代理访问后端API
const API_BASE_URL = '';

/**
 * 产品类型接口
 */
interface CategoriesResponse {
  success: boolean;
  data: {
    categories: string[];
  };
}

/**
 * 产品接口
 */
interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  healthScore: number;
  description: string;
}

/**
 * 产品详情接口
 */
interface ProductDetail {
  id: string;
  name: string;
  brand: string;
  category: string;
  originalCategory?: string;
  image: string;
  createdAt: string;
  updatedAt: string;
  healthScore: number;
  healthLevel: string;
  healthAnalysis?: string;
  ingredients?: {
    id: string;
    ingredientsList: string;
    ingredients: Array<{
      name: string;
      isHarmful: boolean;
      harmfulLevel: number;
    }>;
    mainIssues: string[];
    goodPoints: string[];
    createdAt: string;
    updatedAt: string;
    scoreAnalyzedAt: string;
  };
}

/**
 * 产品详情响应接口
 */
interface ProductDetailResponse {
  success: boolean;
  data: {
    product: ProductDetail;
  };
}

/**
 * 产品列表响应接口
 */
interface ProductsResponse {
  success: boolean;
  data: {
    products: Product[];
    total: number;
    category: string;
    sortBy: string;
  };
}

/**
 * 获取所有产品类型（去重）
 * @returns {Promise<string[]>} 产品类型数组
 */
export async function getProductCategories(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recommendations/categories`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: CategoriesResponse = await response.json();
    
    if (!data.success) {
      throw new Error('API返回失败状态');
    }
    
    return data.data.categories;
  } catch (error) {
    console.error('获取产品类型失败:', error);
    // 返回默认类型作为后备方案
    return ['全部', '饮料', '零食', '调味品', '主食'];
  }
}

/**
 * 获取推荐产品列表
 * @param {Object} params - 查询参数
 * @param {string} params.category - 产品类别（可选，默认"全部"）
 * @param {string} params.sortBy - 排序方式（可选，默认"healthScore"）
 * @param {number} params.limit - 返回数量限制（可选，默认50）
 * @returns {Promise<Product[]>} 产品数组
 */
export async function getRecommendedProducts(params: {
  category?: string;
  sortBy?: string;
  limit?: number;
} = {}): Promise<Product[]> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.category) {
      queryParams.append('category', params.category);
    }
    if (params.sortBy) {
      queryParams.append('sortBy', params.sortBy);
    }
    if (params.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    
    const url = `${API_BASE_URL}/api/recommendations/products${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: ProductsResponse = await response.json();
    
    if (!data.success) {
      throw new Error('API返回失败状态');
    }
    
    return data.data.products;
  } catch (error) {
    console.error('获取推荐产品失败:', error);
    // 返回空数组作为后备方案
    return [];
  }
}

/**
 * 获取产品详细信息
 * @param {string} productId - 产品ID
 * @returns {Promise<ProductDetail | null>} 产品详情或null
 */
export async function getProductDetail(productId: string): Promise<ProductDetail | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recommendations/product/${productId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: ProductDetailResponse = await response.json();
    
    if (!data.success) {
      throw new Error('API返回失败状态');
    }
    
    return data.data.product;
  } catch (error) {
    console.error('获取产品详情失败:', error);
    return null;
  }
}

export type { Product, ProductDetail }; 