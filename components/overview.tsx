import { SparklesCore } from "@/components/ui/sparkles";
import React from "react";

export const Overview = () => {
  const MemoizedSparkles = React.useMemo(() => (
    <SparklesCore
        background="transparent"
        minSize={0.4}
        maxSize={1}
        particleDensity={800}
        className="w-full h-full"
        particleColor="#FFFFFF"
    />
  ), []); // Empty dependency array means this will only be created once

    return (
        <div className="flex-1 w-full bg-black flex flex-col items-center justify-center overflow-hidden rounded-md">
          <h1 className="md:text-8xl text-6xl lg:text-10xl font-bold text-center text-white relative z-20">
            Raghu
          </h1>
          <div className="w-[40rem] h-20 relative">
            {/* Gradients */}
            <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 
    blur-sm" />
            <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
            <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 
    blur-sm" />
            <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />
    
            {/* Core component */}
            {MemoizedSparkles}
            {/* Radial Gradient to prevent sharp edges */}
            <div className="absolute inset-0 w-full h-60 bg-black 
    [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>
          </div>
        </div>
      );   
}; 