"use client";

import { RigidBody, CapsuleCollider } from "@react-three/rapier";
import { useThree, useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { useEffect, useRef } from "react";

export default function Player() {
  const { camera } = useThree();
  const rb = useRef<any>(null);
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useFrame(() => {
    if (!rb.current) return;

    const forward = new Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new Vector3();
    right.crossVectors(forward, new Vector3(0, 1, 0));

    const speed = 5;
    const velocity = new Vector3(0, 0, 0);

    if (keys.current["w"]) velocity.add(forward.clone().multiplyScalar(speed));
    if (keys.current["s"]) velocity.add(forward.clone().multiplyScalar(-speed));
    if (keys.current["a"]) velocity.add(right.clone().multiplyScalar(-speed));
    if (keys.current["d"]) velocity.add(right.clone().multiplyScalar(speed));

    rb.current.setLinvel({ x: velocity.x, y: 0, z: velocity.z }, true);

    const pos = rb.current.translation();
    camera.position.set(pos.x, 1.6, pos.z);
  });

  return (
    <RigidBody
      ref={rb}
      position={[15, 1, -5]}
      type="dynamic"
      colliders={false}
      lockRotations
      linearDamping={10}
    >
      <CapsuleCollider args={[0.4, 0.3]} />
    </RigidBody>
  );
}
