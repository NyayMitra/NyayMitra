import React from 'react';
import { Button } from '../components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroSectionImg from "/heroSectionImg.png"
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Model } from "./Model";
import { Center } from "@react-three/drei";


const HeroSection = () => {
  return (
    <section className="min-h-screen flex items-center justify-center px-6 pt-20 bg-gradient-hero bg-[radial-gradient(circle_at_left_center,_#2323FF_0%,_#06102A_18%,_transparent_50%)]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="text-center space-y-8 animate-fade-in">
          <div className="space-y-6 text-center">
            <h1 className="text-5xl lg:text-7xl font-bold text-white">
              Nyay Mitra
            </h1>
            <p className="text-xl lg:text-3xl text-gradient font-semibold text-[#EFBF04]">
              "Your Friend of justice"
            </p>
          </div>
          
          <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed">
            Helping citizens understand their cases and lawyers uncover deeper insights, 
            all powered by the Indian Judicial System.
          </p>

          <Link to="/chat">
            <Button 
              size="lg" 
              className="gradient-primary hover:shadow-glow transition-all duration-300 text-lg px-8 py-6 rounded-full bg-transparent border border-[#EFBF04]"
            >
              Try Nyay Mitra
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        <div className="flex justify-center items-center lg:justify-end w-full h-[400px] lg:h-[500px] animate-slide-up-delay">
          <Canvas camera={{ position: [0, 2, 6], fov: 45 }}>
            <ambientLight intensity={10} />
            <directionalLight position={[2, 2, 2]} intensity={10} />
            <directionalLight position={[-5, 2, -5]} intensity={2} />
            <spotLight
              position={[0, 10, 0]}
              angle={0.3}
              penumbra={0.5}
              intensity={1}
              castShadow
            />
              <Model />
            <OrbitControls enableZoom={false} />
          </Canvas>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;