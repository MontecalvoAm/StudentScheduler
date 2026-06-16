"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { MapPin, Plus, X, Search, RefreshCw } from "lucide-react";

interface Room {
  RoomId: number;
  RoomCode: string;
  RoomName: string;
  Building: string | null;
  Capacity: number;
  IsActive: boolean;
}

export default function AdminRoomsPage() {
  const { addToast } = useUIStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [building, setBuilding] = useState("");
  const [capacity, setCapacity] = useState(40);
  const [submitting, setSubmitting] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const result = await res.json();
        setRooms(result.rooms);
      } else {
        addToast({ type: "error", title: "Error", message: "Failed to fetch rooms." });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          RoomCode: roomCode,
          RoomName: roomName,
          Building: building || undefined,
          Capacity: capacity,
        }),
      });

      if (res.ok) {
        addToast({ type: "success", title: "Room Created" });
        setIsOpen(false);
        resetForm();
        fetchRooms();
      } else {
        const result = await res.json();
        addToast({ type: "error", title: "Failed to create room", message: result.message });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setRoomCode("");
    setRoomName("");
    setBuilding("");
    setCapacity(40);
  };

  const filtered = rooms.filter(
    (r) =>
      r.RoomCode.toLowerCase().includes(search.toLowerCase()) ||
      r.RoomName.toLowerCase().includes(search.toLowerCase()) ||
      (r.Building && r.Building.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em", margin: 0, lineHeight: 1.25 }}>Facility Rooms</h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 0", fontWeight: 400 }}>Configure academic buildings, rooms, and maximum student capacities.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsOpen(true);
          }}
          className="pm-btn-primary self-start sm:self-center flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Room
        </button>
      </div>

      {/* Filter panel */}
      <div className="pm-card flex gap-4" style={{ padding: 16 }}>
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, room name, or building..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs placeholder:text-slate-400"
          />
        </div>
        <button
          onClick={fetchRooms}
          className="pm-btn-secondary flex items-center"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-xs">Querying rooms...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pm-card" style={{ padding: 48, textAlign: "center", color: "#64748B", fontSize: 14 }}>
          No rooms registered.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((room) => (
            <div
              key={room.RoomId}
              className="pm-card pm-card-animate flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="pm-badge" style={{ background: "#F5F3FF", color: "#6D28D9", fontSize: 10, fontWeight: 700 }}>
                    {room.RoomCode}
                  </span>
                  <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>{room.Capacity} Seats</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", lineHeight: 1.3 }} className="truncate">
                  {room.RoomName}
                </h3>
                {room.Building && (
                  <p className="flex items-center gap-1.5" style={{ fontSize: 13, color: "#64748B", marginTop: 10 }}>
                    <MapPin className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
                    {room.Building}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal: Create Room ─── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center justify-center p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Add Facility Room</h3>
              <p className="text-xs text-slate-500 mt-1">Configure layout parameters and seating thresholds.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Room Code</label>
                <input
                  type="text"
                  required
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. LAB-1"
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Room Name</label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Computer Lab 1"
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Building Location</label>
                <input
                  type="text"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  placeholder="e.g. Engineering Building"
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Max Seating Capacity</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={500}
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                {submitting ? "Saving..." : "Add Room Record"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
