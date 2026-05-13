"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { RigidBody, CapsuleCollider } from "@react-three/rapier";
import { Vector3 } from "three";

const SPEED = 4;
const DIR = new Vector3();

export default function Player() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const bodyRef = useRef<any>(null);
  const keys = useRef<Set<string>>(new Set());

  useEffect(() => {
    camera.position.set(0, 1.6, 8);

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      keys.current.add(e.code);
      if (e.code === "Escape") document.exitPointerLock();
    };
    const onKeyUp = (e: globalThis.KeyboardEvent) => {
      keys.current.delete(e.code);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [camera]);

  useFrame((_, delta) => {
    const locked = document.pointerLockElement;
    if (!bodyRef.current) return;

    if (locked) {
      const forward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      forward.y = 0;
      right.y = 0;
      forward.normalize();
      right.normalize();

      DIR.set(0, 0, 0);
      if (keys.current.has("KeyW")) DIR.add(forward);
      if (keys.current.has("KeyS")) DIR.sub(forward);
      if (keys.current.has("KeyA")) DIR.sub(right);
      if (keys.current.has("KeyD")) DIR.add(right);

      if (DIR.length() > 0) {
        DIR.normalize().multiplyScalar(SPEED);
        bodyRef.current.setLinvel({ x: DIR.x, y: 0, z: DIR.z }, true);
      } else {
        bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    }

    const pos = bodyRef.current.translation();
    camera.position.set(pos.x, 1.6, pos.z);
  });

  return (
    <>
      <PointerLockControls ref={controlsRef} />
      <RigidBody ref={bodyRef} position={[0, 0.8, 8]} enabledRotations={[false, false, false]} lockRotations>
        <CapsuleCollider args={[0.4, 0.3]} position={[0, 0.8, 0]} />
      </RigidBody>
    </>
  );
}
