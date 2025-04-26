
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Image, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ScanStage = "upload" | "processing" | "results";
type ImageType = "product" | "ingredients";

const ScanPage = () => {
  const [stage, setStage] = useState<ScanStage>("upload");
  const [productImage, setProductImage] = useState<string | null>(null);
  const [ingredientsImage, setIngredientsImage] = useState<string | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, type: ImageType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (type === "product") {
        setProductImage(result);
      } else {
        setIngredientsImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = () => {
    if (!productImage || !ingredientsImage) {
      toast.error("请上传产品和配料表的图片");
      return;
    }
    
    setStage("processing");
    
    // Simulate processing time
    setTimeout(() => {
      setStage("results");
    }, 2000);
  };
  
  const resetScan = () => {
    setStage("upload");
    setProductImage(null);
    setIngredientsImage(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="page-title">配料健康分析</h1>
      
      {stage === "upload" && (
        <>
          <div className="flex flex-col sm:flex-row gap-4">
            <ImageUploadCard
              title="产品照片"
              description="上传产品正面图片"
              icon={<Camera className="h-8 w-8" />}
              image={productImage}
              onChange={(e) => handleImageUpload(e, "product")}
            />
            
            <ImageUploadCard
              title="配料表照片"
              description="上传配料表清晰图片"
              icon={<Image className="h-8 w-8" />}
              image={ingredientsImage}
              onChange={(e) => handleImageUpload(e, "ingredients")}
            />
          </div>
          
          <Button 
            className="w-full mt-4 bg-app-green hover:bg-app-green-dark"
            disabled={!productImage || !ingredientsImage}
            onClick={handleAnalyze}
          >
            分析配料表
          </Button>
        </>
      )}
      
      {stage === "processing" && (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-app-green" />
          <p className="mt-4 text-lg">正在分析配料表...</p>
          <p className="mt-2 text-sm text-gray-500">这可能需要几秒钟时间</p>
        </div>
      )}
      
      {stage === "results" && (
        <AnalysisResults onReset={resetScan} />
      )}
    </div>
  );
};

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
    <div className="flex-1">
      <p className="font-medium mb-2 text-sm text-gray-700">{title}</p>
      <label className="cursor-pointer block">
        <div 
          className={cn(
            "border-2 border-dashed rounded-xl flex flex-col items-center justify-center h-40 transition-all",
            image 
              ? "border-app-green bg-white" 
              : "border-gray-300 bg-gray-50 hover:bg-gray-100"
          )}
        >
          {image ? (
            <div className="w-full h-full overflow-hidden rounded-lg">
              <img 
                src={image} 
                className="w-full h-full object-cover" 
                alt={title} 
              />
            </div>
          ) : (
            <div className="flex flex-col items-center p-4">
              <div className="text-app-green mb-2">
                {icon}
              </div>
              <p className="text-sm text-center text-gray-500">{description}</p>
              <p className="text-xs text-app-green-dark mt-2">点击上传</p>
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

type AnalysisResultsProps = {
  onReset: () => void;
};

const AnalysisResults = ({ onReset }: AnalysisResultsProps) => {
  // Simulated analysis results
  const ingredientsList = [
    { name: "纯净水", rating: "健康", suitable: "所有人群", notSuitable: "无" },
    { name: "白砂糖", rating: "中性", suitable: "适量摄入", notSuitable: "糖尿病患者" },
    { name: "食用香精", rating: "注意", suitable: "少量摄入", notSuitable: "过敏体质" },
    { name: "柠檬酸", rating: "中性", suitable: "正常摄入", notSuitable: "胃酸过多人群" },
    { name: "防腐剂", rating: "警告", suitable: "极少量", notSuitable: "孕妇、儿童" },
  ];
  
  const healthScore = 65; // 0-100 scale
  
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="text-xl font-semibold mb-4">健康评分</h2>
        <div className="flex items-center justify-center mb-4">
          <div className={cn(
            "rounded-full h-32 w-32 flex items-center justify-center text-white text-3xl font-bold",
            healthScore >= 80 ? "bg-green-500" :
            healthScore >= 60 ? "bg-yellow-500" : "bg-red-500"
          )}>
            {healthScore}
          </div>
        </div>
        <p className="text-center text-gray-600 mb-2">
          {healthScore >= 80 ? "健康选择" :
           healthScore >= 60 ? "适量食用" : "谨慎选择"}
        </p>
      </Card>
      
      <Card className="p-5">
        <h2 className="text-xl font-semibold mb-4">配料详情</h2>
        <div className="space-y-3">
          {ingredientsList.map((ingredient, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="font-medium">{ingredient.name}</p>
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs",
                  ingredient.rating === "健康" ? "bg-green-100 text-green-800" :
                  ingredient.rating === "中性" ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                )}>
                  {ingredient.rating}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                <span className="font-medium">适合: </span>
                {ingredient.suitable}
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-medium">不适合: </span>
                {ingredient.notSuitable}
              </p>
            </div>
          ))}
        </div>
      </Card>
      
      <Button 
        className="w-full bg-app-green hover:bg-app-green-dark"
        onClick={onReset}
      >
        重新扫描
      </Button>
    </div>
  );
};

export default ScanPage;
