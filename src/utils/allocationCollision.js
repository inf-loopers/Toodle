import { closestCorners, pointerWithin } from '@dnd-kit/core';

// Pointer drops must land inside a course; keyboard dragging uses proximity.
export const allocationCollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : closestCorners(args);
