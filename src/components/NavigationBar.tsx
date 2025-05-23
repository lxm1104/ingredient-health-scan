import React from "react";
import { NavLink } from "react-router-dom";
import { Camera, Apple, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const NavigationBar = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around">
        <NavItem to="/" icon={<Home className="h-6 w-6" />} label="首页" />
        <NavItem to="/scan" icon={<Camera className="h-6 w-6" />} label="扫一扫" />
        <NavItem to="/recommendations" icon={<Apple className="h-6 w-6" />} label="推荐" />
      </div>
    </nav>
  );
};

type NavItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
};

const NavItem = ({ to, icon, label }: NavItemProps) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center justify-center py-3 px-5 text-xs",
          isActive
            ? "text-app-green-dark font-medium"
            : "text-gray-500"
        )
      }
    >
      <div className="flex items-center justify-center mb-1">
        {icon}
      </div>
      <span>{label}</span>
    </NavLink>
  );
};

export default NavigationBar;
