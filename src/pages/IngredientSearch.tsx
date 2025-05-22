import { useState } from 'react';
import { z } from 'zod';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// 定义请求和响应的类型
const urlSchema = z.object({
  imageUrl: z.string().url("请输入有效的图片URL")
});

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
  };
};

function IngredientSearch() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [testMode, setTestMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 如果是测试模式，则不验证URL
      if (!testMode) {
        // 验证URL
        urlSchema.parse({ imageUrl: url });
      }
      
      setLoading(true);
      setError(null);
      
      // 调用API
      const response = await fetch('http://localhost:3001/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageUrl: url || 'https://example.com/test-image.jpg', // 测试模式下使用默认URL
          testMode: testMode
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // 根据不同的状态码设置不同的错误提示
        const errorMessage = data.message || '分析图片失败';
        
        // 如果是超时错误，提供额外建议
        if (response.status === 400 && errorMessage.includes('Qwen 模型请求图片失败')) {
          setError(`${errorMessage}
提示: 可能是图片下载超时，建议尝试使用国内可访问的图片源或体积较小的图片。`);
        } 
        // 如果是API超时错误
        else if (response.status === 408) {
          setError(`${errorMessage}
提示: 服务器处理超时，请稍后重试或使用测试模式。`);
        }
        // 其他错误
        else {
          setError(errorMessage);
        }
        throw new Error(errorMessage);
      }
      
      setResult(data.data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else if (err instanceof Error && !error) {
        // 如果上面没有设置过error，则使用这个默认消息
        setError(err.message);
      } else if (!error) {
        setError('发生未知错误');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6" id="src/pages/IngredientSearch.tsx:1:1">
      <h1 className="text-3xl font-bold mb-6">食品配料健康扫描</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Card id="src/pages/IngredientSearch.tsx:56:11">
            <CardHeader>
              <CardTitle>分析食品配料表</CardTitle>
              <CardDescription>
                输入一张食品包装的图片URL，系统将自动识别产品信息和配料表
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" id="src/pages/IngredientSearch.tsx:64:15">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">图片URL</Label>
                  <Input 
                    id="imageUrl" 
                    placeholder="https://example.com/food-image.jpg" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={testMode}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="test-mode"
                    checked={testMode}
                    onCheckedChange={setTestMode}
                  />
                  <Label htmlFor="test-mode">使用测试模式</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          测试模式使用预设数据，不会调用API分析图片。
                          <br />如果您遇到API超时或图片下载失败，可以使用此模式进行测试。
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {error && (
                  <Alert variant="destructive" id="src/pages/IngredientSearch.tsx:74:19" className="whitespace-pre-line">
                    <AlertTitle>错误</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" disabled={loading} id="src/pages/IngredientSearch.tsx:79:17">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      分析中...
                    </>
                  ) : testMode ? '使用测试数据' : '分析图片'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div>
          {result && (
            <Card id="src/pages/IngredientSearch.tsx:93:13">
              <CardHeader>
                <CardTitle>分析结果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">产品信息</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm font-medium">品牌：</div>
                    <div>{result.product.brand}</div>
                    <div className="text-sm font-medium">名称：</div>
                    <div>{result.product.name}</div>
                    <div className="text-sm font-medium">类型：</div>
                    <div>{result.product.productType}</div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">配料表</h3>
                  <p className="text-sm text-gray-500">
                    {result.ingredients.ingredientsList}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">配料分析</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.ingredients.ingredients.map((ingredient, index) => (
                      <Badge 
                        key={index}
                        variant={ingredient.isHarmful ? "destructive" : "secondary"}
                      >
                        {ingredient.name}
                        {ingredient.isHarmful && ` (危害度: ${ingredient.harmfulLevel})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <div className="text-xs text-gray-500">
                  * 注意：配料分析结果仅供参考，请以专业医疗建议为准
                </div>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default IngredientSearch; 