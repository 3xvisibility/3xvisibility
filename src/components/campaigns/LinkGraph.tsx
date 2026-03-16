import { useEffect, useRef, useState, useCallback } from "react";

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  linkCount: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface LinkGraphProps {
  pages: { id: string; title: string }[];
  links: { source_page_id: string; target_page_id: string }[];
  className?: string;
}

const NODE_RADIUS = 6;
const LABEL_OFFSET = 10;

export function LinkGraph({ pages, links, className = "" }: LinkGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ nodeId: string | null; offsetX: number; offsetY: number }>({
    nodeId: null,
    offsetX: 0,
    offsetY: 0,
  });

  // Responsive sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({ width: Math.max(300, width), height: Math.max(250, Math.min(450, width * 0.6)) });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Initialize nodes and edges
  useEffect(() => {
    const linkCountMap = new Map<string, number>();
    for (const link of links) {
      linkCountMap.set(link.source_page_id, (linkCountMap.get(link.source_page_id) || 0) + 1);
      linkCountMap.set(link.target_page_id, (linkCountMap.get(link.target_page_id) || 0) + 1);
    }

    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const radius = Math.min(cx, cy) * 0.6;

    nodesRef.current = pages.map((page, i) => {
      const angle = (2 * Math.PI * i) / pages.length;
      return {
        id: page.id,
        label: page.title.length > 25 ? page.title.slice(0, 22) + "..." : page.title,
        x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 20,
        y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        linkCount: linkCountMap.get(page.id) || 0,
      };
    });

    edgesRef.current = links.map((l) => ({ source: l.source_page_id, target: l.target_page_id }));
  }, [pages, links, dimensions]);

  const getNodeAt = useCallback((mx: number, my: number): GraphNode | null => {
    const dpr = window.devicePixelRatio || 1;
    const x = mx * dpr;
    const y = my * dpr;
    for (const node of nodesRef.current) {
      const dx = node.x * dpr - x;
      const dy = node.y * dpr - y;
      if (dx * dx + dy * dy < (NODE_RADIUS + 4) * (NODE_RADIUS + 4) * dpr * dpr) {
        return node;
      }
    }
    return null;
  }, []);

  // Force simulation + rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    let running = true;
    let iteration = 0;

    const simulate = () => {
      if (!running) return;
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const decay = Math.max(0.01, 1 - iteration * 0.005);

      if (iteration < 200) {
        // Repulsion (all pairs)
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            let dx = nodes[j].x - nodes[i].x;
            let dy = nodes[j].y - nodes[i].y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (800 / (dist * dist)) * decay;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            nodes[i].vx -= fx;
            nodes[i].vy -= fy;
            nodes[j].vx += fx;
            nodes[j].vy += fy;
          }
        }

        // Attraction (edges)
        for (const edge of edges) {
          const s = nodes.find((n) => n.id === edge.source);
          const t = nodes.find((n) => n.id === edge.target);
          if (!s || !t) continue;
          let dx = t.x - s.x;
          let dy = t.y - s.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 80) * 0.02 * decay;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          s.vx += fx;
          s.vy += fy;
          t.vx -= fx;
          t.vy -= fy;
        }

        // Center gravity
        const cx = dimensions.width / 2;
        const cy = dimensions.height / 2;
        for (const node of nodes) {
          node.vx += (cx - node.x) * 0.001;
          node.vy += (cy - node.y) * 0.001;
        }

        // Apply velocities
        for (const node of nodes) {
          if (dragRef.current.nodeId === node.id) continue;
          node.vx *= 0.85;
          node.vy *= 0.85;
          node.x += node.vx;
          node.y += node.vy;
          // Bounds
          node.x = Math.max(NODE_RADIUS + 2, Math.min(dimensions.width - NODE_RADIUS - 2, node.x));
          node.y = Math.max(NODE_RADIUS + 2, Math.min(dimensions.height - NODE_RADIUS - 2, node.y));
        }

        iteration++;
      }

      // Draw
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Get CSS variable colors from computed styles
      const rootStyle = getComputedStyle(document.documentElement);
      const primaryHsl = rootStyle.getPropertyValue("--primary").trim();
      const mutedFgHsl = rootStyle.getPropertyValue("--muted-foreground").trim();
      const fgHsl = rootStyle.getPropertyValue("--foreground").trim();
      const bgHsl = rootStyle.getPropertyValue("--background").trim();

      // Draw edges
      for (const edge of edges) {
        const s = nodes.find((n) => n.id === edge.source);
        const t = nodes.find((n) => n.id === edge.target);
        if (!s || !t) continue;

        const isHighlighted = hoveredNode === s.id || hoveredNode === t.id;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = isHighlighted
          ? `hsl(${primaryHsl} / 0.6)`
          : `hsl(${mutedFgHsl} / 0.15)`;
        ctx.lineWidth = isHighlighted ? 1.5 : 0.8;
        ctx.stroke();

        // Arrowhead
        if (isHighlighted) {
          const angle = Math.atan2(t.y - s.y, t.x - s.x);
          const arrowLen = 6;
          const mx = t.x - Math.cos(angle) * (NODE_RADIUS + 2);
          const my = t.y - Math.sin(angle) * (NODE_RADIUS + 2);
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(mx - arrowLen * Math.cos(angle - 0.4), my - arrowLen * Math.sin(angle - 0.4));
          ctx.lineTo(mx - arrowLen * Math.cos(angle + 0.4), my - arrowLen * Math.sin(angle + 0.4));
          ctx.closePath();
          ctx.fillStyle = `hsl(${primaryHsl} / 0.6)`;
          ctx.fill();
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const isHovered = hoveredNode === node.id;
        const isConnected = hoveredNode && edges.some(
          (e) => (e.source === hoveredNode && e.target === node.id) || (e.target === hoveredNode && e.source === node.id)
        );
        const nodeSize = NODE_RADIUS + Math.min(node.linkCount * 0.5, 4);

        // Glow for hovered
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeSize + 4, 0, Math.PI * 2);
          ctx.fillStyle = `hsl(${primaryHsl} / 0.15)`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2);
        ctx.fillStyle = isHovered
          ? `hsl(${primaryHsl})`
          : isConnected
            ? `hsl(${primaryHsl} / 0.7)`
            : `hsl(${mutedFgHsl} / 0.5)`;
        ctx.fill();

        // Label
        ctx.font = `${isHovered || isConnected ? "600" : "400"} 10px -apple-system, sans-serif`;
        ctx.fillStyle = isHovered || isConnected
          ? `hsl(${fgHsl})`
          : `hsl(${mutedFgHsl} / 0.8)`;
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + nodeSize + LABEL_OFFSET);
      }

      animRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [dimensions, hoveredNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (dragRef.current.nodeId) {
      const node = nodesRef.current.find((n) => n.id === dragRef.current.nodeId);
      if (node) {
        node.x = mx;
        node.y = my;
        node.vx = 0;
        node.vy = 0;
      }
      return;
    }

    const node = getNodeAt(mx, my);
    setHoveredNode(node?.id || null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = node ? "grab" : "default";
    }
  }, [getNodeAt]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const node = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
    if (node) {
      dragRef.current = { nodeId: node.id, offsetX: 0, offsetY: 0 };
      if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
    }
  }, [getNodeAt]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = { nodeId: null, offsetX: 0, offsetY: 0 };
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
  }, []);

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No pages to visualize
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full rounded-lg border border-border bg-background"
      />
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>{pages.length} pages &middot; {links.length} links</span>
        <span>Drag nodes to rearrange</span>
      </div>
    </div>
  );
}
