import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

const modelUrl = new URL("/public/model.glb", import.meta.url).href;

export function Model(props) {
  const group = useRef();
  const { scene } = useGLTF(modelUrl);

  useFrame(() => {
    if (group.current) {
      group.current.rotation.y += 0.003;
    }
  });

  return <primitive ref={group} object={scene} scale={5, 5, 5} {...props} />;
}

useGLTF.preload(modelUrl);
