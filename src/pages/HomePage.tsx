
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Apple, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-col items-center pt-8 pb-8">
        <h1 className="text-4xl font-bold text-app-green-dark">查配料</h1>
        <p className="text-gray-600 mt-2 text-center">
          了解产品配料，做出更健康的选择
        </p>
      </div>

      <Card className="bg-gradient-to-br from-app-green-light to-app-green p-6 rounded-2xl shadow-md">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">配料健康分析</h2>
            <p className="text-white text-opacity-90 text-sm">
              拍照上传产品配料表，快速分析健康指数
            </p>
          </div>
          <div className="bg-white bg-opacity-30 p-3 rounded-full">
            <Camera className="h-8 w-8 text-white" />
          </div>
        </div>
        <Button 
          className="w-full mt-4 bg-white text-app-green-dark hover:bg-gray-100" 
          onClick={() => navigate("/scan")}
        >
          开始分析
        </Button>
      </Card>

      <Card className="bg-gradient-to-br from-app-blue-light to-app-blue p-6 rounded-2xl shadow-md">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">健康产品推荐</h2>
            <p className="text-white text-opacity-90 text-sm">
              发现高评分、更健康的产品替代选择
            </p>
          </div>
          <div className="bg-white bg-opacity-30 p-3 rounded-full">
            <Apple className="h-8 w-8 text-white" />
          </div>
        </div>
        <Button 
          className="w-full mt-4 bg-white text-app-blue-dark hover:bg-gray-100" 
          onClick={() => navigate("/recommendations")}
        >
          浏览产品
        </Button>
      </Card>

      <div className="pt-6 text-center">
        <p className="text-gray-500 text-sm flex items-center justify-center">
          <Heart className="h-4 w-4 mr-1 text-app-green" /> 
          做出更健康的选择
        </p>
      </div>
    </div>
  );
};

export default HomePage;
