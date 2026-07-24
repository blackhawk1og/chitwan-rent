import { useState } from "react";
import { useFlatComments, useCreateFlatComment } from "../hooks/useFlatComments.js";
import { formatRelativeTime } from "../lib/format.js";

export default function CommentsSection({ flatId, isAuthenticated, onNeedAuth }) {
  const { data: comments = [], isLoading } = useFlatComments(flatId);
  const createComment = useCreateFlatComment(flatId);
  const [text, setText] = useState("");

  const handlePost = () => {
    if (!text.trim() || createComment.isPending) return;
    if (!isAuthenticated) {
      onNeedAuth();
      return;
    }
    createComment.mutate(text.trim(), { onSuccess: () => setText("") });
  };

  return (
    <div className="mt-6">
      <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Comments</div>

      <div className="mt-3 space-y-3">
        {isLoading && <p className="text-sm text-text-muted">Loading comments…</p>}
        {!isLoading && comments.length === 0 && (
          <p className="text-sm text-text-muted">No comments yet — be the first!</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="rounded-xl border border-white/10 bg-surface-alt px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-text-primary">{c.name || "A renter"}</span>
              <span className="shrink-0 text-xs text-text-muted">{formatRelativeTime(c.created_at)} ago</span>
            </div>
            <p className="mt-1 text-sm text-text-primary/90">{c.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handlePost()}
          placeholder="Add a comment…"
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-surface-alt px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <button
          type="button"
          onClick={handlePost}
          disabled={!text.trim() || createComment.isPending}
          className="shrink-0 rounded-full bg-accent-purple px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-purple-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          Post
        </button>
      </div>
    </div>
  );
}
