import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Star, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProductCategories, getRecommendedProducts, type Product } from "@/services/recommendationService";

const RecommendationsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [sortBy, setSortBy] = useState("healthScore");
  const [categories, setCategories] = useState<string[]>(["全部"]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取产品类型
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const fetchedCategories = await getProductCategories();
        setCategories(fetchedCategories);
      } catch (err) {
        console.error('加载产品类型失败:', err);
        setError('加载产品类型失败');
      }
    };

    loadCategories();
  }, []);

  // 获取产品数据
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const fetchedProducts = await getRecommendedProducts({
          category: selectedCategory,
          sortBy,
          limit: 50
        });
        setProducts(fetchedProducts);
      } catch (err) {
        console.error('加载产品数据失败:', err);
        setError('加载产品数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [selectedCategory, sortBy]);

  // 错误状态显示
  if (error && !loading && products.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="page-title" id="src/pages/RecommendationsPage.tsx:58:10">健康产品推荐</h1>
        <div className="flex flex-col items-center justify-center p-8 text-center" id="src/pages/RecommendationsPage.tsx:59:12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-app-green hover:bg-app-green-dark"
            id="src/pages/RecommendationsPage.tsx:63:13"
          >
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title" id="src/pages/RecommendationsPage.tsx:74:8">健康产品推荐</h1>
      
      <div className="flex gap-3 mb-4" id="src/pages/RecommendationsPage.tsx:76:7">
        <div className="flex-1" id="src/pages/RecommendationsPage.tsx:77:9">
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="bg-white" id="src/pages/RecommendationsPage.tsx:82:13">
              <SelectValue placeholder="选择类别" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1" id="src/pages/RecommendationsPage.tsx:94:9">
          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <SelectTrigger className="bg-white" id="src/pages/RecommendationsPage.tsx:99:13">
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="healthScore">健康评分</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-8" id="src/pages/RecommendationsPage.tsx:110:9">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-gray-600">正在加载产品数据...</span>
        </div>
      )}
      
      {/* 产品列表 */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="src/pages/RecommendationsPage.tsx:118:9">
          {products.length > 0 ? (
            products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full text-center py-8" id="src/pages/RecommendationsPage.tsx:124:13">
              <p className="text-gray-600">暂无产品数据</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

type ProductCardProps = {
  product: Product;
};

const ProductCard = ({ product }: ProductCardProps) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200" 
      onClick={handleCardClick}
      id="src/pages/RecommendationsPage.tsx:144:5"
    >
      <div className="h-40 bg-gray-100" id="src/pages/RecommendationsPage.tsx:149:7">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/300x150?text=产品图片";
          }}
          id="src/pages/RecommendationsPage.tsx:150:9"
        />
      </div>
      <div className="p-4" id="src/pages/RecommendationsPage.tsx:159:7">
        <div className="flex justify-between items-start mb-2" id="src/pages/RecommendationsPage.tsx:160:9">
          <h3 className="font-medium" id="src/pages/RecommendationsPage.tsx:161:11">{product.name}</h3>
          <div className={cn(
            "text-xs font-bold px-2 py-1 rounded-full",
            product.healthScore >= 80 ? "bg-green-100 text-green-800" :
            product.healthScore >= 60 ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          )} id="src/pages/RecommendationsPage.tsx:162:11">
            {product.healthScore}分
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-2" id="src/pages/RecommendationsPage.tsx:169:9">{product.category}</p>
        <p className="text-sm text-gray-600 mb-3" id="src/pages/RecommendationsPage.tsx:170:9">{product.description}</p>
        <div className="flex items-center" id="src/pages/RecommendationsPage.tsx:171:9">
          <div className="flex space-x-1" id="src/pages/RecommendationsPage.tsx:172:11">
            {[...Array(5)].map((_, idx) => (
              <Star
                key={idx}
                className={cn(
                  "h-4 w-4",
                  idx < Math.round(product.healthScore / 20)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300"
                )}
                id={`src/pages/RecommendationsPage.tsx:174:15:${idx}`}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RecommendationsPage;
