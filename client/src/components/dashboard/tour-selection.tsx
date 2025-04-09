import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapEvent, TourGroup } from "@/types";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Calendar, MapPin, Users } from "lucide-react";

interface TourSelectionProps {
  tours: TourGroup[];
  onSelectTour: (tour: TourGroup) => void;
  selectedTourId: number | null;
}

export function TourSelection({ tours, onSelectTour, selectedTourId }: TourSelectionProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Active Tours</h3>
          <p className="text-sm text-gray-500">Select a tour to view routing opportunities</p>
        </div>
        
        <ScrollArea className="h-[400px]">
          <div className="divide-y">
            {tours.map((tour) => (
              <TourItem 
                key={tour.id} 
                tour={tour} 
                isSelected={tour.id === selectedTourId}
                onSelect={() => onSelectTour(tour)}
              />
            ))}
            
            {tours.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <p>No active tours found.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface TourItemProps {
  tour: TourGroup;
  isSelected: boolean;
  onSelect: () => void;
}

function TourItem({ tour, isSelected, onSelect }: TourItemProps) {
  const percentConfirmed = Math.round((tour.confirmedShows / tour.totalShows) * 100);
  
  return (
    <div 
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-gray-900">{tour.name}</h4>
          <p className="text-sm text-gray-600">{tour.artistName}</p>
          
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(tour.startDate)} - {formatDate(tour.endDate)}
            </span>
            
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {tour.region}
            </span>
            
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {tour.confirmedShows}/{tour.totalShows} shows
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <Badge variant={isSelected ? "default" : "outline"}>
            {percentConfirmed}% Confirmed
          </Badge>
          
          {isSelected && (
            <Button size="sm" variant="ghost" className="h-7 gap-1">
              <span className="text-xs">Details</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full mt-3">
        <div 
          className="h-full bg-green-500 rounded-full" 
          style={{ width: `${percentConfirmed}%` }}
        />
      </div>
    </div>
  );
}