import React, { useState } from "react";
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, Image, Link, Loader2, Info, RefreshCw, AlertCircle, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// URL验证模式
const urlSchema = z.string().url("请输入有效的图片链接");

// 数据类型定义
type ScanStage = "input" | "processing" | "results";
type InputMode = "upload" | "url";

type AnalysisResult = {
  product: {
    id: string;
    brand: string;
    name: string;
    productType: string;
    imageUrl: string;
  };
  ingredients: {
    id: string;
    ingredientsList: string;
    ingredients: {
      name: string;
      isHarmful: boolean;
      harmfulLevel: number;
    }[];
    healthScore?: number;
    healthLevel?: string;
    healthAnalysis?: string;
    mainIssues?: string[];
    goodPoints?: string[];
  };
};

type RecommendedProduct = {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  healthScore: number;
  healthLevel: string;
};

const ScanPage = () => {
  // 状态管理
  const [stage, setStage] = useState<ScanStage>("input");
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // 图片上传处理
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError(null);
    }
  };

  // 获取同类推荐产品
  const fetchRecommendations = async (productType: string, excludeId: string) => {
    try {
      setLoadingRecommendations(true);
      const response = await fetch(
        `/api/recommendations/similar?productType=${encodeURIComponent(productType)}&excludeId=${excludeId}&limit=5`
      );
      
      if (!response.ok) {
        throw new Error('获取推荐产品失败');
      }
      
      const data = await response.json();
      if (data.success) {
        setRecommendations(data.data.products);
      }
    } catch (error) {
      console.error('获取推荐产品失败:', error);
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // 分析处理
  const handleAnalyze = async () => {
    if (!imageFile && !imageUrl) {
      setError("请选择图片或输入图片链接");
      return;
    }

    // 验证URL格式（如果是URL模式）
    if (inputMode === "url") {
      try {
        urlSchema.parse(imageUrl);
      } catch (error) {
        if (error instanceof z.ZodError) {
          setError(error.errors[0].message);
          return;
        }
      }
    }

    setStage("processing");
    setError(null);

    try {
      let requestBody;
      
      if (inputMode === "upload" && imageFile) {
        // 图片上传模式
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const response = await fetch('/api/analyze-image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`分析失败: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          setResult(data.data);
          setStage("results");
          
          // 获取同类推荐产品
          await fetchRecommendations(data.data.product.productType, data.data.product.id);
        } else {
          throw new Error(data.message || '分析失败');
        }
      } else if (inputMode === "url" && imageUrl) {
        // URL输入模式
        requestBody = { imageUrl };
        
        const response = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`分析失败: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          setResult(data.data);
          setStage("results");
          
          // 获取同类推荐产品
          await fetchRecommendations(data.data.product.productType, data.data.product.id);
        } else {
          throw new Error(data.message || '分析失败');
        }
      }
    } catch (error) {
      console.error('分析失败:', error);
      setError(error instanceof Error ? error.message : '分析失败，请重试');
      setStage("input");
    }
  };
  
  // 重置扫描
  const resetScan = () => {
    setStage("input");
    setImageFile(null);
    setImageUrl("");
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setRecommendations([]);
  };

  // 切换输入模式
  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setImageFile(null);
    setImageUrl("");
    setPreviewUrl(null);
    setError(null);
  };

  if (stage === "processing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-app-green-light to-white flex items-center justify-center p-4" id="src/pages/ScanPage.tsx:154:5">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-app-green mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">正在分析中...</h3>
            <p className="text-sm text-gray-600 text-center">
              AI正在识别产品信息和配料表，请稍候
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "results" && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-app-green-light to-white p-4" id="src/pages/ScanPage.tsx:170:5">
        <div className="max-w-4xl mx-auto">
          <AnalysisResults 
            result={result} 
            onReset={resetScan}
            recommendations={recommendations}
            loadingRecommendations={loadingRecommendations}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-app-green-light to-white p-4" id="src/pages/ScanPage.tsx:183:3">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">配料健康扫描</h1>
          <p className="text-gray-600">上传食品包装图片或输入图片链接，AI帮你分析配料健康度</p>
        </div>

        <Card className="mb-6" id="src/pages/ScanPage.tsx:190:9">
          <CardHeader>
            <CardTitle>选择输入方式</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-6">
              <Button
                variant={inputMode === "upload" ? "default" : "outline"}
                onClick={() => handleInputModeChange("upload")}
                className={cn(
                  "flex-1",
                  inputMode === "upload" && "bg-app-green hover:bg-app-green-dark"
                )}
              >
                <Upload className="mr-2 h-4 w-4" />
                上传图片
              </Button>
              <Button
                variant={inputMode === "url" ? "default" : "outline"}
                onClick={() => handleInputModeChange("url")}
                className={cn(
                  "flex-1",
                  inputMode === "url" && "bg-app-green hover:bg-app-green-dark"
                )}
              >
                <Link className="mr-2 h-4 w-4" />
                输入链接
              </Button>
            </div>

            {inputMode === "upload" ? (
              <ImageUploadCard
                title="拍照或上传图片"
                description="支持JPG、PNG等格式，建议图片清晰可见配料表"
                icon={<Camera className="h-8 w-8" />}
                image={previewUrl}
                onChange={handleImageUpload}
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    图片链接
                  </label>
                  <Input
                    type="url"
                    placeholder="请输入图片链接，如：https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full"
                  />
                </div>
                {imageUrl && (
                  <div className="border-2 border-dashed border-app-green rounded-xl p-4">
                    <img 
                      src={imageUrl} 
                      alt="预览图片" 
                      className="w-full h-48 object-contain rounded"
                      onError={() => setError("图片链接无效或无法加载")}
                    />
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button 
              className="w-full mt-6 bg-app-green hover:bg-app-green-dark"
              onClick={handleAnalyze}
              disabled={(!imageFile && !imageUrl) || !!error}
            >
              <Camera className="mr-2 h-4 w-4" />
              开始分析
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-gray-500">
          <p>* 分析结果仅供参考，请以专业医疗建议为准</p>
        </div>
      </div>
    </div>
  );
};

// 图片上传卡片组件
type ImageUploadCardProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const ImageUploadCard = ({
  title,
  description,
  icon,
  image,
  onChange
}: ImageUploadCardProps) => {
  return (
    <div className="w-full" id="src/pages/ScanPage.tsx:287:5">
      <label className="cursor-pointer block">
        <div 
          className={cn(
            "border-2 border-dashed rounded-xl flex flex-col items-center justify-center h-48 transition-all",
            image 
              ? "border-app-green bg-white" 
              : "border-gray-300 bg-gray-50 hover:bg-gray-100"
          )}
        >
          {image ? (
            <div className="w-full h-full overflow-hidden rounded-lg p-2">
              <img 
                src={image} 
                className="w-full h-full object-contain" 
                alt={title} 
              />
            </div>
          ) : (
            <div className="flex flex-col items-center p-6">
              <div className="text-app-green mb-3">
                {icon}
              </div>
              <p className="text-sm text-center text-gray-700 font-medium mb-1">{title}</p>
              <p className="text-xs text-center text-gray-500 mb-3">{description}</p>
              <p className="text-xs text-app-green-dark font-medium">点击上传图片</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onChange}
          />
        </div>
      </label>
    </div>
  );
};

// 分析结果组件
type AnalysisResultsProps = {
  result: AnalysisResult;
  onReset: () => void;
  recommendations: RecommendedProduct[];
  loadingRecommendations: boolean;
};

const AnalysisResults = ({ result, onReset, recommendations, loadingRecommendations }: AnalysisResultsProps) => {
  const healthScore = result.ingredients.healthScore || 65;
  const healthLevel = result.ingredients.healthLevel || "一般";
  
  return (
    <div className="space-y-6" id="src/pages/ScanPage.tsx:408:5">
      {/* 产品信息卡片 */}
      <Card id="src/pages/ScanPage.tsx:410:7">
        <CardHeader>
          <CardTitle>产品信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">品牌</p>
              <p className="text-lg">{result.product.brand}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">名称</p>
              <p className="text-lg">{result.product.name}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-500">类型</p>
              <p className="text-lg">{result.product.productType}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 健康评分卡片 */}
      <Card id="src/pages/ScanPage.tsx:432:7">
        <CardHeader>
          <CardTitle>健康评分</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center mb-6">
            <div className={cn(
              "rounded-full h-32 w-32 flex items-center justify-center text-white text-3xl font-bold shadow-lg",
              healthScore >= 90 ? "bg-green-600" :
              healthScore >= 80 ? "bg-green-500" :
              healthScore >= 70 ? "bg-yellow-500" :
              healthScore >= 60 ? "bg-orange-500" : "bg-red-500"
            )}>
              {healthScore}
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-xl font-semibold text-gray-800">{healthLevel}</p>
            {result.ingredients.healthAnalysis && (
              <p className="text-sm text-gray-600">{result.ingredients.healthAnalysis}</p>
            )}
          </div>
          
          {/* 健康分析详情 */}
          {(result.ingredients.mainIssues || result.ingredients.goodPoints) && (
            <div className="mt-6 space-y-4">
              {result.ingredients.goodPoints && result.ingredients.goodPoints.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-700 mb-2">健康亮点</h4>
                  <div className="space-y-1">
                    {result.ingredients.goodPoints.map((point, index) => (
                      <p key={index} className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        • {point}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
              {result.ingredients.mainIssues && result.ingredients.mainIssues.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-orange-700 mb-2">注意事项</h4>
                  <div className="space-y-1">
                    {result.ingredients.mainIssues.map((issue, index) => (
                      <p key={index} className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        • {issue}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 配料表信息 */}
      <Card id="src/pages/ScanPage.tsx:484:7">
        <CardHeader>
          <CardTitle>配料表分析</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">完整配料表</h4>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              {result.ingredients.ingredientsList}
            </p>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">配料成分分析</h4>
            <div className="flex flex-wrap gap-2">
              {result.ingredients.ingredients.map((ingredient, index) => (
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
        </CardContent>
        <CardFooter>
          <p className="text-xs text-gray-500">
            * 配料分析结果仅供参考，请以专业医疗建议为准
          </p>
        </CardFooter>
      </Card>
      
      {/* 同类产品推荐 */}
      <RecommendationsSection 
        recommendations={recommendations}
        loading={loadingRecommendations}
        productType={result.product.productType}
      />
      
      {/* 操作按钮 */}
      <div className="flex gap-4" id="src/pages/ScanPage.tsx:525:7">
        <Button 
          className="flex-1 bg-app-green hover:bg-app-green-dark"
          onClick={onReset}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          重新分析
        </Button>
      </div>
    </div>
  );
};

// 推荐产品组件
type RecommendationsProps = {
  recommendations: RecommendedProduct[];
  loading: boolean;
  productType: string;
};

const RecommendationsSection = ({ recommendations, loading, productType }: RecommendationsProps) => {
  if (loading) {
    return (
      <Card id="src/pages/ScanPage.tsx:334:7">
        <CardHeader>
          <CardTitle>同类健康产品推荐</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-app-green mr-2" />
            <span className="text-gray-600">正在加载推荐产品...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card id="src/pages/ScanPage.tsx:349:7">
        <CardHeader>
          <CardTitle>同类健康产品推荐</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">暂无同类产品推荐</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="src/pages/ScanPage.tsx:362:5">
      <CardHeader>
        <CardTitle>同类健康产品推荐</CardTitle>
        <p className="text-sm text-gray-600">为您推荐同类型的健康产品</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((product) => (
            <div key={product.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                {product.image && (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-800 truncate">{product.name}</h4>
                  <p className="text-sm text-gray-600 truncate">{product.brand}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      product.healthScore >= 90 ? "bg-green-100 text-green-800" :
                      product.healthScore >= 80 ? "bg-green-100 text-green-700" :
                      product.healthScore >= 70 ? "bg-yellow-100 text-yellow-800" :
                      "bg-orange-100 text-orange-800"
                    )}>
                      {product.healthScore}分
                    </div>
                    <span className="text-xs text-gray-500">{product.healthLevel}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScanPage;
