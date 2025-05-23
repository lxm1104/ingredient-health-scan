import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Info, AlertCircle, CheckCircle } from "lucide-react";
import { getProductDetail, type ProductDetail } from "@/services/recommendationService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadProductDetail(id);
    }
  }, [id]);

  const loadProductDetail = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const productData = await getProductDetail(productId);
      
      if (productData) {
        setProduct(productData);
      } else {
        setError('产品信息不存在或加载失败');
      }
    } catch (error) {
      console.error('加载产品详情失败:', error);
      setError('加载产品详情失败');
      toast.error('加载产品详情失败');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '未知时间';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-600";
    if (score >= 80) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    if (score >= 60) return "bg-orange-500";
    return "bg-red-500";
  };

  const getHealthLevelColor = (level: string) => {
    switch (level) {
      case '优秀': return 'bg-green-100 text-green-800';
      case '良好': return 'bg-green-100 text-green-700';
      case '一般': return 'bg-yellow-100 text-yellow-800';
      case '较差': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-app-green-light to-white p-4" id="src/pages/ProductDetailPage.tsx:71:5">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-app-green-light to-white p-4" id="src/pages/ProductDetailPage.tsx:90:5">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
            id="src/pages/ProductDetailPage.tsx:95:11"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
          
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">加载失败</h3>
              <p className="text-gray-600 text-center mb-4">{error}</p>
              <Button onClick={() => id && loadProductDetail(id)}>
                重试
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-app-green-light to-white p-4" id="src/pages/ProductDetailPage.tsx:115:3">
      <div className="max-w-4xl mx-auto">
        {/* 返回按钮 */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
          id="src/pages/ProductDetailPage.tsx:120:9"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>

        {/* 产品基本信息 */}
        <Card className="mb-6" id="src/pages/ProductDetailPage.tsx:129:9">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 产品图片 */}
              <div className="flex justify-center">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full max-w-sm h-64 object-contain rounded-lg shadow-md"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-image.jpg';
                  }}
                />
              </div>
              
              {/* 产品信息 */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">{product.name}</h1>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{product.brand}</Badge>
                    <Badge variant="outline">{product.category}</Badge>
                  </div>
                </div>
                
                {/* 健康评分 */}
                <div className="bg-white rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">健康评分</h3>
                    <Badge className={getHealthLevelColor(product.healthLevel)}>
                      {product.healthLevel}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "rounded-full h-16 w-16 flex items-center justify-center text-white text-xl font-bold shadow-md",
                      getHealthScoreColor(product.healthScore)
                    )}>
                      {product.healthScore}
                    </div>
                    
                    {product.healthAnalysis && (
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">{product.healthAnalysis}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 产品信息详情 */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>添加时间：{formatDate(product.createdAt)}</span>
                  </div>
                  {product.originalCategory && product.originalCategory !== product.category && (
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      <span>原始分类：{product.originalCategory}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 配料表分析 */}
        {product.ingredients && (
          <Card className="mb-6" id="src/pages/ProductDetailPage.tsx:187:9">
            <CardHeader>
              <CardTitle>配料表分析</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 完整配料表 */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">完整配料表</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {product.ingredients.ingredientsList}
                  </p>
                </div>
              </div>

              <Separator />

              {/* 配料成分分析 */}
              {product.ingredients.ingredients && product.ingredients.ingredients.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">配料成分分析</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.ingredients.ingredients.map((ingredient, index) => (
                      <Badge 
                        key={index}
                        variant={ingredient.isHarmful ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {ingredient.name}
                        {ingredient.isHarmful && ` (风险度: ${ingredient.harmfulLevel})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* 健康分析详情 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 健康亮点 */}
                {product.ingredients.goodPoints && product.ingredients.goodPoints.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      健康亮点
                    </h4>
                    <div className="space-y-2">
                      {product.ingredients.goodPoints.map((point, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">
                            {point}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 注意事项 */}
                {product.ingredients.mainIssues && product.ingredients.mainIssues.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      注意事项
                    </h4>
                    <div className="space-y-2">
                      {product.ingredients.mainIssues.map((issue, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-orange-700 bg-orange-50 px-3 py-2 rounded-md">
                            {issue}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 分析时间 */}
              {product.ingredients.scoreAnalyzedAt && (
                <div className="text-xs text-gray-500 pt-4 border-t">
                  配料分析时间：{formatDate(product.ingredients.scoreAnalyzedAt)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 免责声明 */}
        <Card>
          <CardContent className="p-4 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              * 以上分析结果仅供参考，请以专业医疗建议为准。产品信息来源于公开数据，如有疑问请咨询专业人士。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductDetailPage; 