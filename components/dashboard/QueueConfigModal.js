"use client";

import { useState, useEffect } from "react";
import { X, Save, Trash2, AlertTriangle, Shield, ListMusic } from "lucide-react";

const SCOPE_OPTIONS = [
  { value: "requests", label: "Requests only" },
  { value: "approved", label: "Approved only" },
  { value: "both", label: "Requests & Approved" },
];

export default function QueueConfigModal({
  isOpen,
  onClose,
  djProfile,
  onSave,
}) {
  const [autoDeleteDuplicates, setAutoDeleteDuplicates] = useState(false);
  const [duplicateScope, setDuplicateScope] = useState("both");
  const [autoRejectExplicit, setAutoRejectExplicit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });

  useEffect(() => {
    if (!isOpen || !djProfile) return;
    setAutoDeleteDuplicates(!!djProfile.auto_delete_duplicates);
    setDuplicateScope(
      ["requests", "approved", "both"].includes(djProfile.duplicate_scope)
        ? djProfile.duplicate_scope
        : "both"
    );
    setAutoRejectExplicit(!!djProfile.auto_reject_explicit);
    setStatus({ type: "", msg: "" });
  }, [isOpen, djProfile]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setStatus({ type: "", msg: "" });
    try {
      const res = await fetch("/api/dj-queue-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dj_id: djProfile.id,
          auto_delete_duplicates: autoDeleteDuplicates,
          duplicate_scope: duplicateScope,
          auto_reject_explicit: autoRejectExplicit,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save");
      if (onSave) onSave({
        auto_delete_duplicates: autoDeleteDuplicates,
        duplicate_scope: duplicateScope,
        auto_reject_explicit: autoRejectExplicit,
      });
      setStatus({ type: "success", msg: "Queue settings saved." });
      setTimeout(() => { onClose(); setStatus({ type: "", msg: "" }); }, 800);
    } catch (e) {
      setStatus({ type: "error", msg: e.message || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#16161f]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/20 rounded-lg">
              <ListMusic size={18} className="text-purple-400" />
            </div>
            <h3 className="font-bold text-white">Queue & request rules</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {status.msg && (
            <div
              className={`text-sm rounded-xl px-3 py-2 flex items-center gap-2 ${
                status.type === "success"
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {status.type === "success" ? <Save size={16} /> : <AlertTriangle size={16} />}
              {status.msg}
            </div>
          )}

          {/* Auto-delete duplicates */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trash2 size={18} className="text-gray-400" />
              <label className="text-sm font-medium text-white">Auto-remove duplicate songs</label>
            </div>
            <p className="text-xs text-gray-500">
              When a song is already in the queue (same track), remove the duplicate. You can run this now when saving, and new duplicates can be skipped or removed.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAutoDeleteDuplicates(!autoDeleteDuplicates)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoDeleteDuplicates ? "bg-pink-500" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    autoDeleteDuplicates ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-gray-400">
                {autoDeleteDuplicates ? "On" : "Off"}
              </span>
            </div>
            {autoDeleteDuplicates && (
              <div className="pl-1">
                <p className="text-xs text-gray-500 mb-2">Apply in:</p>
                <div className="flex flex-wrap gap-2">
                  {SCOPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDuplicateScope(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        duplicateScope === opt.value
                          ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                          : "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Auto-reject explicit */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-gray-400" />
              <label className="text-sm font-medium text-white">Auto-reject explicit songs</label>
            </div>
            <p className="text-xs text-gray-500">
              New requests marked as explicit will be automatically rejected and moved to Rejected.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAutoRejectExplicit(!autoRejectExplicit)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoRejectExplicit ? "bg-pink-500" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    autoRejectExplicit ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-gray-400">
                {autoRejectExplicit ? "On" : "Off"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-[#16161f] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-pink-600 hover:bg-pink-500 text-white disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
