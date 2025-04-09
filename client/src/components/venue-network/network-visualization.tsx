import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import * as d3 from "d3";

interface NetworkNode {
  id: number;
  name: string;
  city: string;
  state: string;
  isCurrentVenue: boolean;
  collaborativeBookings: number;
  trustScore: number;
}

interface NetworkLink {
  source: number | NetworkNode;
  target: number | NetworkNode;
  value: number;
}

interface VenueNetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

interface NetworkVisualizationProps {
  data: VenueNetworkData;
  onNodeClick?: (node: NetworkNode) => void;
  onAddVenue?: () => void;
}

export function NetworkVisualization({
  data,
  onNodeClick,
  onAddVenue
}: NetworkVisualizationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Set up resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries[0]) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);
  
  // Create and update network visualization
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length || dimensions.width === 0) return;
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    const svg = d3.select(svgRef.current);
    
    // Create a force simulation
    const simulation = d3.forceSimulation<NetworkNode, NetworkLink>(data.nodes)
      .force("link", d3.forceLink<NetworkNode, NetworkLink>(data.links)
        .id(d => d.id)
        .distance(100))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2));
    
    // Create links
    const link = svg.append("g")
      .selectAll("line")
      .data(data.links)
      .enter()
      .append("line")
      .attr("stroke", d => {
        const sourceNode = typeof d.source === 'object' ? d.source : data.nodes.find(n => n.id === d.source);
        const targetNode = typeof d.target === 'object' ? d.target : data.nodes.find(n => n.id === d.target);
        
        if (sourceNode?.isCurrentVenue || targetNode?.isCurrentVenue) {
          return "#a5b4fc"; // Primary connections
        }
        return "#d1d5db"; // Secondary connections
      })
      .attr("stroke-width", d => {
        const sourceNode = typeof d.source === 'object' ? d.source : data.nodes.find(n => n.id === d.source);
        const targetNode = typeof d.target === 'object' ? d.target : data.nodes.find(n => n.id === d.target);
        
        if (sourceNode?.isCurrentVenue || targetNode?.isCurrentVenue) {
          return 2;
        }
        return 1;
      })
      .attr("stroke-dasharray", d => {
        const sourceNode = typeof d.source === 'object' ? d.source : data.nodes.find(n => n.id === d.source);
        const targetNode = typeof d.target === 'object' ? d.target : data.nodes.find(n => n.id === d.target);
        
        if (sourceNode?.isCurrentVenue || targetNode?.isCurrentVenue) {
          return "5,2";
        }
        return "3,3";
      });
    
    // Create node groups
    const node = svg.append("g")
      .selectAll("g")
      .data(data.nodes)
      .enter()
      .append("g")
      .call(d3.drag<SVGGElement, NetworkNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      )
      .on("click", (event, d) => {
        if (onNodeClick) onNodeClick(d);
      });
    
    // Add circles for nodes
    node.append("circle")
      .attr("r", d => d.isCurrentVenue ? 30 : 20)
      .attr("fill", d => d.isCurrentVenue ? "#1e40af" : "#4f46e5")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2);
    
    // Add node labels
    node.append("text")
      .text(d => d.name)
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("fill", "white")
      .style("font-size", d => d.isCurrentVenue ? "10px" : "8px")
      .style("pointer-events", "none");
    
    // Update force simulation on tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => typeof d.source === 'object' ? d.source.x || 0 : 0)
        .attr("y1", d => typeof d.source === 'object' ? d.source.y || 0 : 0)
        .attr("x2", d => typeof d.target === 'object' ? d.target.x || 0 : 0)
        .attr("y2", d => typeof d.target === 'object' ? d.target.y || 0 : 0);
      
      node.attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);
    });
    
    return () => {
      simulation.stop();
    };
  }, [data, dimensions, onNodeClick]);
  
  const zoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const currentTransform = d3.zoomTransform(svg.node()!);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(currentTransform.k * 1.2)
    );
  };
  
  const zoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const currentTransform = d3.zoomTransform(svg.node()!);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(currentTransform.k / 1.2)
    );
  };
  
  const resetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      d3.zoomIdentity
    );
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="sm:flex sm:items-center sm:justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Venue Network</h3>
          <div className="mt-3 sm:mt-0 sm:ml-4">
            <Button onClick={onAddVenue}>
              <Plus className="mr-1 h-4 w-4" />
              Invite Venue
            </Button>
          </div>
        </div>
        
        <div 
          ref={containerRef} 
          className="bg-gray-50 h-80 rounded-lg overflow-hidden relative"
        >
          <svg 
            ref={svgRef} 
            width={dimensions.width} 
            height={dimensions.height}
            className="w-full h-full"
          />
          
          {/* Network Controls */}
          <div className="absolute bottom-4 right-4 flex space-x-2">
            <button 
              className="bg-white rounded-full p-2 shadow hover:bg-gray-100"
              onClick={zoomIn}
            >
              <ZoomIn className="h-4 w-4 text-gray-600" />
            </button>
            <button 
              className="bg-white rounded-full p-2 shadow hover:bg-gray-100"
              onClick={zoomOut}
            >
              <ZoomOut className="h-4 w-4 text-gray-600" />
            </button>
            <button 
              className="bg-white rounded-full p-2 shadow hover:bg-gray-100"
              onClick={resetZoom}
            >
              <Maximize className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* Network Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-700">
              {data.nodes.length - 1}
            </div>
            <div className="text-sm text-gray-500">Connected Venues</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-700">
              {data.nodes.reduce((sum, node) => sum + (node.collaborativeBookings || 0), 0)}
            </div>
            <div className="text-sm text-gray-500">Collaborative Bookings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-700">
              {Math.round(
                data.nodes
                  .filter(node => !node.isCurrentVenue)
                  .reduce((sum, node) => sum + (node.trustScore || 0), 0) / 
                (data.nodes.length - 1 || 1)
              )}%
            </div>
            <div className="text-sm text-gray-500">Trust Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-700">3</div>
            <div className="text-sm text-gray-500">Pending Invites</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
