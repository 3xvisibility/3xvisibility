import { useState, useCallback, useRef, useMemo } from "react";

/**
 * Hook for drag-and-drop reordering of a list.
 * Persists order as an array of IDs in localStorage.
 */
export function useDragReorder<T extends { id: string }>(
  items: T[],
  storageKey: string
) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const ordered = useMemo(() => {
    if (customOrder.length === 0) return items;
    const orderMap = new Map(customOrder.map((id, i) => [id, i]));
    const sorted = [...items].sort((a, b) => {
      const ai = orderMap.get(a.id);
      const bi = orderMap.get(b.id);
      if (ai === undefined && bi === undefined) return 0;
      if (ai === undefined) return 1;
      if (bi === undefined) return -1;
      return ai - bi;
    });
    return sorted;
  }, [items, customOrder]);

  const handleDragStart = useCallback((index: number) => {
    setDragIdx(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setOverIdx(index);
    },
    []
  );

  const handleDrop = useCallback(
    (index: number) => {
      if (dragIdx === null || dragIdx === index) {
        setDragIdx(null);
        setOverIdx(null);
        return;
      }
      const newOrder = ordered.map((item) => item.id);
      const [moved] = newOrder.splice(dragIdx, 1);
      newOrder.splice(index, 0, moved);
      setCustomOrder(newOrder);
      localStorage.setItem(storageKey, JSON.stringify(newOrder));
      setDragIdx(null);
      setOverIdx(null);
    },
    [dragIdx, ordered, storageKey]
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setOverIdx(null);
  }, []);

  const resetOrder = useCallback(() => {
    setCustomOrder([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const getDragProps = useCallback(
    (index: number) => ({
      draggable: true,
      onDragStart: () => handleDragStart(index),
      onDragOver: (e: React.DragEvent) => handleDragOver(e, index),
      onDrop: () => handleDrop(index),
      onDragEnd: handleDragEnd,
      className:
        dragIdx === index
          ? "opacity-40 scale-[0.97] transition-all duration-150"
          : overIdx === index && dragIdx !== null
          ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background transition-all duration-150"
          : "transition-all duration-150",
    }),
    [dragIdx, overIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd]
  );

  return {
    ordered,
    getDragProps,
    isDragging: dragIdx !== null,
    hasCustomOrder: customOrder.length > 0,
    resetOrder,
  };
}
