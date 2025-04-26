
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data for product recommendations
const mockProducts = [
  {
    id: 1,
    name: "有机纯椰子水",
    category: "饮料",
    image: "https://images.unsplash.com/photo-1587825045776-5a4520530a4b?w=800&auto=format&fit=crop",
    healthScore: 95,
    description: "100%纯天然椰子水，无添加糖分和防腐剂"
  },
  {
    id: 2,
    name: "全麦杂粮饼干",
    category: "零食",
    image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop",
    healthScore: 85,
    description: "采用全麦粉和多种杂粮制作，低糖低脂"
  },
  {
    id: 3,
    name: "天然蜂蜜",
    category: "调味品",
    image: "https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=800&auto=format&fit=crop",
    healthScore: 90,
    description: "纯天然蜂蜜，无添加糖浆，保留原始营养"
  },
  {
    id: 4,
    name: "有机豆腐",
    category: "主食",
    image: "https://images.unsplash.com/photo-1584321480756-a5f3e0db04ba?w=800&auto=format&fit=crop",
    healthScore: 92,
    description: "有机大豆制作，不含防腐剂和添加剂"
  },
  {
    id: 5,
    name: "草莓蜜饯",
    category: "零食",
    image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800&auto=format&fit=crop",
    healthScore: 60,
    description: "新鲜草莓制作，含少量添加糖"
  },
  {
    id: 6,
    name: "鲜榨橙汁",
    category: "饮料",
    image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&auto=format&fit=crop",
    healthScore: 88,
    description: "100%鲜榨橙汁，不含添加糖和防腐剂"
  }
];

const categories = ["全部", "饮料", "零食", "调味品", "主食"];

const RecommendationsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [sortBy, setSortBy] = useState("healthScore");

  const filteredProducts = mockProducts
    .filter(product => 
      selectedCategory === "全部" ? true : product.category === selectedCategory
    )
    .sort((a, b) => {
      if (sortBy === "healthScore") {
        return b.healthScore - a.healthScore;
      }
      return 0;
    });

  return (
    <div className="space-y-6">
      <h1 className="page-title">健康产品推荐</h1>
      
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="bg-white">
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
        
        <div className="flex-1">
          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="healthScore">健康评分</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

type ProductCardProps = {
  product: {
    id: number;
    name: string;
    category: string;
    image: string;
    healthScore: number;
    description: string;
  };
};

const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <Card className="overflow-hidden">
      <div className="h-40 bg-gray-100">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/300x150?text=产品图片";
          }}
        />
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium">{product.name}</h3>
          <div className={cn(
            "text-xs font-bold px-2 py-1 rounded-full",
            product.healthScore >= 80 ? "bg-green-100 text-green-800" :
            product.healthScore >= 60 ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          )}>
            {product.healthScore}分
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-2">{product.category}</p>
        <p className="text-sm text-gray-600 mb-3">{product.description}</p>
        <div className="flex items-center">
          <div className="flex space-x-1">
            {[...Array(5)].map((_, idx) => (
              <Star
                key={idx}
                className={cn(
                  "h-4 w-4",
                  idx < Math.round(product.healthScore / 20)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RecommendationsPage;
