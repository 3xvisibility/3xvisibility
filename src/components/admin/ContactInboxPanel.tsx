import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Mail, Reply, Trash2, Inbox, Loader2 } from "lucide-react";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  reply_message: string | null;
  replied_at: string | null;
  created_at: string;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-primary/15 text-primary border-primary/30" },
  read: { label: "Read", className: "bg-muted text-muted-foreground border-border" },
  replied: { label: "Replied", className: "bg-success/15 text-success border-success/30" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground border-border" },
};

export function ContactInboxPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load messages", description: error.message, variant: "destructive" });
    } else {
      setItems((data as ContactSubmission[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const matchesStatus = statusFilter === "__all__" || it.status === statusFilter;
      const matchesSearch =
        !q ||
        it.name.toLowerCase().includes(q) ||
        it.email.toLowerCase().includes(q) ||
        (it.subject || "").toLowerCase().includes(q) ||
        it.message.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [items, search, statusFilter]);

  const counts = useMemo(() => {
    const c = { all: items.length, new: 0, read: 0, replied: 0, archived: 0 } as Record<string, number>;
    items.forEach((i) => {
      c[i.status] = (c[i.status] || 0) + 1;
    });
    return c;
  }, [items]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("contact_submissions")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const openMessage = (item: ContactSubmission) => {
    setSelected(item);
    setReplyText(item.reply_message || "");
    if (item.status === "new") updateStatus(item.id, "read");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selected?.id === id) setSelected(null);
    toast({ title: "Message deleted" });
  };

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      const { error: fnError } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-reply",
          recipientEmail: selected.email,
          idempotencyKey: `contact-reply-${selected.id}-${Date.now()}`,
          templateData: {
            name: selected.name,
            reply: replyText.trim(),
            originalSubject: selected.subject,
            originalMessage: selected.message,
          },
        },
      });
      if (fnError) throw fnError;

      const repliedAt = new Date().toISOString();
      const { error: dbError } = await supabase
        .from("contact_submissions")
        .update({ status: "replied", reply_message: replyText.trim(), replied_at: repliedAt })
        .eq("id", selected.id);
      if (dbError) throw dbError;

      setItems((prev) =>
        prev.map((i) =>
          i.id === selected.id
            ? { ...i, status: "replied", reply_message: replyText.trim(), replied_at: repliedAt }
            : i
        )
      );
      toast({ title: "Reply sent", description: `Your reply was emailed to ${selected.email}.` });
      setSelected(null);
    } catch (e: any) {
      toast({ title: "Failed to send reply", description: e?.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, subject, message…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All ({counts.all})</SelectItem>
            <SelectItem value="new">New ({counts.new || 0})</SelectItem>
            <SelectItem value="read">Read ({counts.read || 0})</SelectItem>
            <SelectItem value="replied">Replied ({counts.replied || 0})</SelectItem>
            <SelectItem value="archived">Archived ({counts.archived || 0})</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading messages…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Inbox className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No messages found.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {filtered.map((it) => {
            const meta = STATUS_META[it.status] || STATUS_META.read;
            return (
              <button
                key={it.id}
                onClick={() => openMessage(it)}
                className="w-full text-left p-4 hover:bg-accent/50 transition-colors flex items-start gap-3"
              >
                <Mail className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium truncate ${it.status === "new" ? "text-foreground" : "text-foreground/90"}`}>
                      {it.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{it.email}</span>
                    <Badge variant="outline" className={`ml-auto text-[10px] ${meta.className}`}>
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground/80 truncate mt-0.5">
                    {it.subject || "(no subject)"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{it.message}</p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{fmt(it.created_at)}</span>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.subject || "(no subject)"}</DialogTitle>
                <DialogDescription>
                  From <span className="font-medium text-foreground">{selected.name}</span> ·{" "}
                  <a href={`mailto:${selected.email}`} className="text-primary underline">
                    {selected.email}
                  </a>{" "}
                  · {fmt(selected.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap max-h-48 overflow-auto">
                {selected.message}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Reply className="h-4 w-4" /> Your reply
                </label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={5}
                  placeholder="Type your reply… it will be emailed to the sender."
                />
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus(selected.id, "archived")}
                  >
                    Archive
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => remove(selected.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
                <Button onClick={sendReply} disabled={sending || !replyText.trim()}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Reply className="h-4 w-4 mr-1" />
                  )}
                  Send reply
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContactInboxPanel;
