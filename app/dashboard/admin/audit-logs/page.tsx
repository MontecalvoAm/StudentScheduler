"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { Search, Eye, X, Terminal, Clock, RefreshCw } from "lucide-react";

interface AuditLog {
  AuditLogId: number;
  Action: string;
  EntityType: string;
  EntityId: string | null;
  OldValues: any;
  NewValues: any;
  IpAddress: string | null;
  UserAgent: string | null;
  CreatedAt: string;
  User?: {
    FirstName: string;
    LastName: string;
    Email: string;
  } | null;
}

export default function AdminAuditLogsPage() {
  const { addToast } = useUIStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        search,
      });

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setLogs(result.data);
        setTotalPages(result.meta.totalPages);
      } else {
        addToast({
          type: "error",
          title: "Error",
          message: "Failed to fetch audit logs.",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, search]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em", margin: 0, lineHeight: 1.25 }}>Security Logs</h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 0", fontWeight: 400 }}>Review system activity, database modifications, and access traces.</p>
        </div>
        <button
          onClick={fetchLogs}
          className="pm-btn-secondary self-start sm:self-center flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Logs
        </button>
      </div>

      {/* Search Input */}
      <div className="pm-card" style={{ padding: 16 }}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, email, table name, or entity ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="pm-card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-500 text-xs">Querying security ledger...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No activity records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-4 sm:p-5" style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" }}>Actor</th>
                  <th className="p-4 sm:p-5" style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" }}>Action</th>
                  <th className="p-4 sm:p-5" style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" }}>Target Model</th>
                  <th className="p-4 sm:p-5" style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" }}>IP / Timestamp</th>
                  <th className="p-4 sm:p-5 text-right" style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" }}>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {logs.map((log) => (
                  <tr key={log.AuditLogId} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 sm:p-5">
                        {log.User ? (
                        <div>
                          <h4 style={{ fontWeight: 700, color: "#0F172A", fontSize: 13 }}>
                            {log.User.FirstName} {log.User.LastName}
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">{log.User.Email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">System Process</span>
                      )}
                    </td>
                    <td className="p-4 sm:p-5 font-mono text-[11px]">
                      <span className="pm-badge" style={{ background: "#F5F3FF", color: "#6D28D9", fontSize: 10, fontWeight: 700 }}>
                        {log.Action}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-slate-500 font-medium">
                      {log.EntityType} {log.EntityId && <span className="text-slate-500 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">ID: {log.EntityId}</span>}
                    </td>
                    <td className="p-4 sm:p-5">
                      <div>
                        <p className="text-[11px] text-slate-700 font-semibold">{log.IpAddress ?? "N/A"}</p>
                        <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(log.CreatedAt).toLocaleString()}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-right">
                      {(log.OldValues || log.NewValues) ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
            <span className="text-slate-500 text-xs">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modal: Log Values Detail ─── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 shrink-0">
              <div className="inline-flex items-center justify-center p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Log Changes Payload</h3>
              <p className="text-xs text-slate-500 mt-1">
                Registry ID: {selectedLog.AuditLogId} | Action: {selectedLog.Action}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* Old Values */}
              {selectedLog.OldValues && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Previous State</h4>
                  <pre className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-[10px] text-rose-300 font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.OldValues, null, 2)}
                  </pre>
                </div>
              )}

              {/* New Values */}
              {selectedLog.NewValues && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Updated State</h4>
                  <pre className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-[10px] text-emerald-300 font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.NewValues, null, 2)}
                  </pre>
                </div>
              )}

              {/* Client Info */}
              {selectedLog.UserAgent && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">User Agent</h4>
                  <p className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-[10px] text-slate-500 font-mono">
                    {selectedLog.UserAgent}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
