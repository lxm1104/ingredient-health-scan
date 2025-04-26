
import React from "react";
import { Outlet } from "react-router-dom";
import NavigationBar from "./NavigationBar";

const Layout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 app-container pb-20">
        <Outlet />
      </main>
      <NavigationBar />
    </div>
  );
};

export default Layout;
