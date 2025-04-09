import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Send, Paperclip, ChevronLeft } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { getMessages } from '@/lib/api';

export default function MessagesPage() {
  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: getMessages
  });

  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();

  // Mock conversations - in a real app, these would be fetched from API
  const conversations = [
    {
      id: 1,
      name: "The Black Keys Management",
      avatar: null,
      lastMessage: "We're interested in your venue for our upcoming tour. Do you have availability on Feb 18?",
      time: "10:30 AM",
      unread: true
    },
    {
      id: 2,
      name: "The Fillmore (San Francisco)",
      avatar: null,
      lastMessage: "Let's coordinate on the Japanese Breakfast routing.",
      time: "Yesterday",
      unread: false
    },
    {
      id: 3,
      name: "9:30 Club (Washington DC)",
      avatar: null,
      lastMessage: "Can we discuss a potential venue network collaboration?",
      time: "2 days ago",
      unread: false
    }
  ];

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    toast({
      title: "Message Sent",
      description: "Your message has been sent successfully."
    });

    setNewMessage("");
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-heading font-semibold text-gray-900">Messages</h1>

        <div className="mt-6">
          <Card className="h-[calc(100vh-180px)] flex">
            {/* Conversations List */}
            <div className={`w-full md:w-80 border-r ${selectedConversation ? 'hidden md:block' : 'block'}`}>
              <div className="p-4 border-b">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    className="pl-10"
                    placeholder="Search messages..."
                  />
                </div>
              </div>

              <Tabs defaultValue="all" className="p-2">
                <TabsList className="w-full">
                  <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                  <TabsTrigger value="unread" className="flex-1">Unread</TabsTrigger>
                  <TabsTrigger value="network" className="flex-1">Network</TabsTrigger>
                </TabsList>

                <div className="mt-4 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto p-2">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`flex items-center space-x-4 p-3 rounded-lg cursor-pointer ${
                        conversation.unread ? 'bg-primary-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <Avatar>
                        <AvatarImage src={conversation.avatar || undefined} />
                        <AvatarFallback>{conversation.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <p className="font-medium truncate">{conversation.name}</p>
                          <p className="text-xs text-gray-500">{conversation.time}</p>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {conversation.lastMessage}
                        </p>
                      </div>
                      {conversation.unread && (
                        <Badge className="bg-primary-500 text-white h-2 w-2 rounded-full p-0 ml-1" />
                      )}
                    </div>
                  ))}
                </div>
              </Tabs>
            </div>

            {/* Conversation Details */}
            <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex md:items-center md:justify-center' : 'block'}`}>
              {selectedConversation ? (
                <>
                  <div className="flex items-center p-4 border-b">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden mr-2"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedConversation.avatar || undefined} />
                      <AvatarFallback>{selectedConversation.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="ml-3">
                      <p className="font-medium">{selectedConversation.name}</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="container mx-auto p-4">
                      <div className="space-y-4">
                        {messages?.map((message) => (
                          <div key={message.id} className="p-4 border rounded-lg">
                            <div className="flex justify-between">
                              <span className="font-medium">{message.senderName}</span>
                              <span className="text-gray-500">{message.timestamp}</span>
                            </div>
                            <p className="mt-2">{message.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="icon">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="min-h-[60px] resize-none flex-1"
                      />
                      <Button onClick={handleSendMessage}>
                        <Send className="h-4 w-4 mr-1" />
                        Send
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-8">
                  <p className="text-lg font-medium mb-2">Select a conversation</p>
                  <p className="text-sm text-muted-foreground">Choose a conversation from the list to start messaging</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}