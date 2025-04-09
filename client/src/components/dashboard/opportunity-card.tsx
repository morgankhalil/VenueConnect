import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Music, MapPin } from "lucide-react";
import { PredictionWithDetails } from "@/types";
import { formatDate } from "@/lib/utils";

interface OpportunityCardProps {
  prediction: PredictionWithDetails;
  onSendInquiry: (prediction: PredictionWithDetails) => void;
  onViewDetails: (prediction: PredictionWithDetails) => void;
}

export function OpportunityCard({ 
  prediction, 
  onSendInquiry, 
  onViewDetails 
}: OpportunityCardProps) {
  const { artist, suggestedDate, confidenceScore, reasoning } = prediction;

  const getConfidenceBadgeColor = () => {
    if (confidenceScore >= 85) return "bg-green-100 text-green-800 border-green-200";
    if (confidenceScore >= 70) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  const getBorderColor = () => {
    if (confidenceScore >= 85) return "border-green-200";
    if (confidenceScore >= 70) return "border-yellow-200";
    return "border-blue-200";
  };

  return (
    <Card className={`overflow-hidden shadow ${getBorderColor()}`}>
      <CardContent className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{artist.name}</h3>
          <Badge className={getConfidenceBadgeColor()}>
            {confidenceScore}% Match
          </Badge>
        </div>
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <Calendar className="mr-1 h-4 w-4 text-gray-400" />
          {formatDate(suggestedDate)}
        </div>
        <div className="mt-1 flex items-center text-sm text-gray-500">
          <Music className="mr-1 h-4 w-4 text-gray-400" />
          {artist.genres?.join(" / ") || "Genre N/A"}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium text-primary-600">
              {reasoning?.split(" - ")[0] || "Booking Opportunity"}
            </span>
            {reasoning?.split(" - ")[1] && (
              <p className="text-gray-500">{reasoning.split(" - ")[1]}</p>
            )}
          </div>
        </div>
        <div className="mt-4 flex space-x-3">
          <Button
            className="text-white"
            onClick={() => onSendInquiry(prediction)}
          >
            Send Inquiry
          </Button>
          <Button
            variant="outline"
            onClick={() => onViewDetails(prediction)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
