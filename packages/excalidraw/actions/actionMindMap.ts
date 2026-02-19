import { KEYS, ROUNDNESS } from "@excalidraw/common";
import { register } from "./register";
import { getSelectedElements } from "../scene";
import {
  newElement,
  newElementWith,
  newArrowElement,
  CaptureUpdateAction,
} from "@excalidraw/element";
import {
  ExcalidrawArrowElement,
  ExcalidrawElement,
} from "@excalidraw/element/types";
import {
  isArrowElement,
  isBindableElement,
} from "@excalidraw/element/typeChecks";
import { LocalPoint } from "@excalidraw/math";

const MINDMAP_GAP_X = 200;
const MINDMAP_GAP_Y = 100;

export const actionAddMindMapChild = register({
  name: "addMindMapChild",
  label: "Add child node",
  trackEvent: { category: "element", action: "addMindMapChild" },
  perform: (elements, appState) => {
    const selectedElements = getSelectedElements(elements, appState);
    if (selectedElements.length !== 1) {
      return false;
    }

    const parent = selectedElements[0];
    if (!isBindableElement(parent)) {
      return false;
    }

    // 1. Calculate Child Position (Right)
    const childX = parent.x + parent.width + MINDMAP_GAP_X;
    const childY = parent.y + parent.height / 2 - 50; // Center vertically initially

    // 2. Create Child
    const child = newElement({
      type: "rectangle",
      x: childX,
      y: childY,
      width: 150,
      height: 100,
      strokeColor: parent.strokeColor,
      backgroundColor: parent.backgroundColor,
      fillStyle: parent.fillStyle,
      strokeWidth: parent.strokeWidth,
      strokeStyle: parent.strokeStyle,
      roughness: parent.roughness,
      opacity: parent.opacity,
      roundness: parent.roundness,
    });

    // 3. Create Arrow (Parent -> Child)
    const arrow = newArrowElement({
      type: "arrow",
      x: parent.x + parent.width,
      y: parent.y + parent.height / 2,
      startArrowhead: null,
      endArrowhead: null,
      strokeColor: parent.strokeColor,
      strokeWidth: 2,
      roundness: { type: ROUNDNESS.PROPORTIONAL_RADIUS },
      points: [
        [0, 0] as LocalPoint,
        [
          (child.x - (parent.x + parent.width)) as number,
          (child.y +
            child.height / 2 -
            (parent.y + parent.height / 2)) as number,
        ] as unknown as LocalPoint,
      ],
    });

    // 4. Set Bindings
    Object.assign(arrow, {
      startBinding: {
        elementId: parent.id,
        focusPoint: [1, 0.5],
        fixedPoint: [1, 0.5],
        gap: 10,
      },
      endBinding: {
        elementId: child.id,
        focusPoint: [0, 0.5],
        fixedPoint: [0, 0.5],
        gap: 10,
      },
    });

    // 5. Update Bound Elements for Parent and Child
    const newParent = newElementWith(parent, {
      boundElements: [
        ...(parent.boundElements || []),
        { id: arrow.id, type: "arrow" },
      ],
    });

    const newChild = newElementWith(child, {
      boundElements: [{ id: arrow.id, type: "arrow" }],
    });

    return {
      elements: [
        ...elements.filter((el) => el.id !== parent.id),
        newParent,
        newChild,
        arrow,
      ],
      appState: {
        ...appState,
        selectedElementIds: { [child.id]: true },
        editingTextElement: newChild as any,
      },
      commitToHistory: true,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  keyTest: (event) => event.key === KEYS.TAB && !event.shiftKey,
});

export const actionAddMindMapSibling = register({
  name: "addMindMapSibling",
  label: "Add sibling node",
  trackEvent: { category: "element", action: "addMindMapSibling" },
  perform: (elements, appState) => {
    const selectedElements = getSelectedElements(elements, appState);
    if (selectedElements.length !== 1) {
      return false;
    }

    const current = selectedElements[0];
    if (!isBindableElement(current)) {
      return false;
    }

    // 1. Find Parent
    const incomingArrow = elements.find(
      (el) => isArrowElement(el) && el.endBinding?.elementId === current.id,
    ) as ExcalidrawArrowElement | undefined;

    const parentId = incomingArrow?.startBinding?.elementId;
    const parent = parentId ? elements.find((el) => el.id === parentId) : null;

    // 2. Calculate Sibling Position (Below)
    const siblingX = current.x;
    const siblingY = current.y + current.height + MINDMAP_GAP_Y;

    // 3. Create Sibling
    const sibling = newElement({
      type: "rectangle",
      x: siblingX,
      y: siblingY,
      width: current.width,
      height: current.height,
      strokeColor: current.strokeColor,
      backgroundColor: current.backgroundColor,
      fillStyle: current.fillStyle,
      strokeWidth: current.strokeWidth,
      strokeStyle: current.strokeStyle,
      roughness: current.roughness,
      opacity: current.opacity,
      roundness: current.roundness,
    });

    const newElements: ExcalidrawElement[] = [sibling];
    let newParent: ExcalidrawElement | null = null;

    // 4. Create Arrow (Parent -> Sibling) if parent exists
    if (parent && isBindableElement(parent)) {
      const arrow = newArrowElement({
        type: "arrow",
        x: parent.x + parent.width,
        y: parent.y + parent.height / 2,
        startArrowhead: null,
        endArrowhead: null,
        strokeColor: parent.strokeColor,
        strokeWidth: 2,
        roundness: { type: ROUNDNESS.PROPORTIONAL_RADIUS },
        points: [
          [0, 0] as LocalPoint,
          [
            (sibling.x - (parent.x + parent.width)) as number,
            (sibling.y +
              sibling.height / 2 -
              (parent.y + parent.height / 2)) as number,
          ] as unknown as LocalPoint,
        ],
      });

      Object.assign(arrow, {
        startBinding: {
          elementId: parent.id,
          focusPoint: [1, 0.5],
          fixedPoint: [1, 0.5],
          gap: 10,
        },
        endBinding: {
          elementId: sibling.id,
          focusPoint: [0, 0.5],
          fixedPoint: [0, 0.5],
          gap: 10,
        },
      });

      newElements.push(arrow);

      newParent = newElementWith(parent, {
        boundElements: [
          ...(parent.boundElements || []),
          { id: arrow.id, type: "arrow" },
        ],
      });

      const siblingWithBinding = newElementWith(sibling, {
        boundElements: [{ id: arrow.id, type: "arrow" }],
      });
      newElements[0] = siblingWithBinding;
    }

    const remainingElements = parent
      ? elements.filter((el) => el.id !== parent.id)
      : elements;

    return {
      elements: [
        ...remainingElements,
        ...(newParent ? [newParent] : []),
        ...newElements,
      ],
      appState: {
        ...appState,
        selectedElementIds: { [sibling.id]: true },
        editingTextElement: newElements[0] as any,
      },
      commitToHistory: true,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  keyTest: (event) =>
    event.key === KEYS.ENTER && !event.shiftKey && !event[KEYS.CTRL_OR_CMD],
});
