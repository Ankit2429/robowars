import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListRooms, useCreateRoom } from "@workspace/api-client-react";
import { Plus, Users, Swords, Loader2, Radio } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export default function Lobby() {
  const { data: rooms, isLoading } = useListRooms();
  const createRoom = useCreateRoom();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [hostName, setHostName] = useState("");

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName || !hostName) return;
    
    createRoom.mutate(
      { data: { name: roomName, hostName } },
      {
        onSuccess: (newRoom) => {
          setIsDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
          setLocation(`/battle/${newRoom.id}`);
        }
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-black font-display tracking-widest text-white uppercase flex items-center gap-4">
            <Radio className="h-10 w-10 text-primary animate-pulse" />
            Battle <span className="text-primary">Lobby</span>
          </h1>
          <p className="font-mono text-muted-foreground mt-2 tracking-widest">SELECT A FREQUENCY OR BROADCAST YOUR OWN</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button className="brutal-button px-6 py-3 flex items-center gap-2" data-testid="btn-new-room">
              <Plus className="h-5 w-5" />
              CREATE ROOM
            </button>
          </DialogTrigger>
          <DialogContent className="brutal-border bg-card text-foreground sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl uppercase tracking-widest text-primary">INITIALIZE COMBAT ARENA</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRoom} className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label htmlFor="roomName" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Arena Designation</Label>
                <Input 
                  id="roomName" 
                  value={roomName} 
                  onChange={(e) => setRoomName(e.target.value)} 
                  className="font-mono bg-background border-primary/30 focus-visible:ring-primary h-12"
                  placeholder="e.g. THUNDER DOME"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hostName" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Host Pilot Name</Label>
                <Input 
                  id="hostName" 
                  value={hostName} 
                  onChange={(e) => setHostName(e.target.value)} 
                  className="font-mono bg-background border-primary/30 focus-visible:ring-primary h-12"
                  placeholder="e.g. IRON_COMMANDER"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full brutal-button py-6 bg-primary/20 text-primary border-primary hover:bg-primary hover:text-black"
                disabled={createRoom.isPending}
                data-testid="btn-submit-room"
              >
                {createRoom.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "BROADCAST MATCH"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="brutal-border bg-card p-6 h-48 animate-pulse flex flex-col justify-between">
              <div className="h-6 bg-muted rounded w-2/3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ))
        ) : rooms?.length === 0 ? (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-center brutal-border bg-card/50">
            <Radio className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="font-display text-2xl font-bold mb-2">NO SIGNALS DETECTED</h3>
            <p className="font-mono text-muted-foreground max-w-md">
              The frequencies are quiet. Create a room to broadcast your challenge to other pilots.
            </p>
          </div>
        ) : (
          rooms?.map((room) => (
            <div 
              key={room.id} 
              className="brutal-border bg-card p-6 flex flex-col justify-between group hover:bg-card/80 transition-all relative overflow-hidden"
              data-testid={`card-room-${room.id}`}
            >
              {room.status === "fighting" && (
                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                  <div className="absolute top-0 right-0 bg-destructive text-[10px] font-bold font-mono text-white py-1 px-8 transform translate-x-[30%] translate-y-[20%] rotate-45 shadow-[0_0_10px_rgba(255,0,0,0.5)]">
                    LIVE
                  </div>
                </div>
              )}
              
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${room.status === "waiting" ? "bg-green-500 animate-pulse" : room.status === "fighting" ? "bg-destructive" : "bg-muted-foreground"}`} />
                  <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{room.status}</span>
                </div>
                <h3 className="font-display text-2xl font-bold text-white truncate mb-1">{room.name}</h3>
                <p className="font-mono text-sm text-muted-foreground flex items-center gap-2">
                  <span className="text-primary">HOST:</span> {room.hostName || "Unknown"}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-sm">
                  <Users className="h-4 w-4 text-secondary" />
                  <span>{room.playerCount} / {room.maxPlayers}</span>
                </div>
                
                {room.status === "waiting" && room.playerCount < room.maxPlayers ? (
                  <Link href={`/battle/${room.id}`} className="brutal-button px-4 py-2 text-xs">
                    JOIN COMBAT
                  </Link>
                ) : (
                  <button disabled className="brutal-button px-4 py-2 text-xs opacity-50 cursor-not-allowed border-muted text-muted-foreground">
                    <Swords className="h-4 w-4 mr-2 inline" />
                    IN PROGRESS
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
