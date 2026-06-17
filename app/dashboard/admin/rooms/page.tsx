"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import {
  MapPin,
  Plus,
  X,
  Search,
  RefreshCw,
  Building2,
  CheckCircle2,
  Users,
  Filter,
} from "lucide-react";

interface Room {
  RoomId: number;
  RoomCode: string;
  RoomName: string;
  Building: string | null;
  Capacity: number;
  IsActive: boolean;
}

interface Stats {
  totalRooms: number;
  activeRooms: number;
  totalCapacity: number;
  totalBuildings: number;
}

export default function AdminRoomsPage() {
  const { addToast } = useUIStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<Stats>({ totalRooms: 0, activeRooms: 0, totalCapacity: 0, totalBuildings: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

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
        setStats(result.stats);
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

  const filtered = rooms.filter((r) => {
    const matchesSearch =
      r.RoomCode.toLowerCase().includes(search.toLowerCase()) ||
      r.RoomName.toLowerCase().includes(search.toLowerCase()) ||
      (r.Building && r.Building.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" ? r.IsActive : !r.IsActive);
    return matchesSearch && matchesStatus;
  });

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

      {/* ─── Top Cards Summary ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#6366F1", padding: "24px" } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Rooms</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 text-center">{stats.totalRooms}</div>
          <div className="text-[11px] text-slate-500 font-medium text-center mt-1">Registered facilities</div>
        </div>
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#10B981", padding: "24px" } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Rooms</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 text-center">{stats.activeRooms}</div>
          <div className="text-[11px] text-slate-500 font-medium text-center mt-1">Operational readiness</div>
        </div>
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#F59E0B", padding: "24px" } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Capacity</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 text-center">{stats.totalCapacity}</div>
          <div className="text-[11px] text-slate-500 font-medium text-center mt-1">Combined seating across all rooms</div>
        </div>
      </div>

      {/* ─── Search & Filters ─── */}
      <div className="pm-card flex flex-col lg:flex-row gap-4" style={{ padding: 20 }}>
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, room name, or building..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs placeholder:text-slate-400 font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-8 pr-4 py-2.5 rounded-xl text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:border-indigo-500 appearance-none"
            >
              <option value="ALL">ALL STATUS</option>
              <option value="ACTIVE">ACTIVE ONLY</option>
              <option value="INACTIVE">INACTIVE ONLY</option>
            </select>
          </div>
          <button
            onClick={fetchRooms}
            className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-xs font-semibold">Querying Facilities...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pm-card" style={{ padding: 64, textAlign: "center", color: "#94A3B8", fontSize: 14, fontWeight: 500, fontStyle: "italic" }}>
          No rooms registered in the facility catalog.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((room) => (
            <div
              key={room.RoomId}
              className="pm-card pm-card-animate flex flex-col justify-between group"
              style={{ padding: "24px" }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-block px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-extrabold tracking-wider border border-indigo-100 uppercase">
                    {room.RoomCode}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    <span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>{room.Capacity} Seats</span>
                  </div>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", lineHeight: 1.4, marginBottom: 10 }} className="line-clamp-2 min-h-[2.8rem]">
                  {room.RoomName}
                </h3>
                {room.Building ? (
                  <p className="flex items-center gap-1.5 leading-relaxed" style={{ fontSize: 13, color: "#64748B", marginTop: 12 }}>
                    <MapPin className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
                    {room.Building}
                  </p>
                ) : (
                  <p className="italic" style={{ fontSize: 12, color: "#CBD5E1", marginTop: 12 }}>No building assigned.</p>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${room.IsActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  {room.IsActive ? 'OPERATIONAL' : 'INACTIVE'}
                </span>
                <button className="text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">Edit Room &rarr;</button>
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

            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Add Facility Room</h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Configure layout parameters and seating thresholds.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Room Code</label>
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Room Name</label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Computer Lab 1"
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Building Location</label>
                <input
                  type="text"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  placeholder="e.g. Engineering Building"
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Max Seating Capacity</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={500}
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-4 rounded-2xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xl shadow-indigo-100 cursor-pointer uppercase tracking-widest"
              >
                {submitting ? "Syncing Facility..." : "Add Room Record"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
