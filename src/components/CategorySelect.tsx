import { useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CategorySelectProps {
  value: string;
  onValueChange: (v: string) => void;
}

const CategorySelect = ({ value, onValueChange }: CategorySelectProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("display_order");
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      const { data, error } = await supabase
        .from("categories")
        .insert({ name, slug })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      onValueChange(data.id);
      setDialogOpen(false);
      setNewName("");
      toast({ title: "카테고리가 추가되었습니다." });
    },
    onError: () => {
      toast({ title: "카테고리 추가 실패", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  };

  return (
    <>
      <Select value={value} onValueChange={(v) => {
        if (v === "__add_new") {
          setDialogOpen(true);
          return;
        }
        onValueChange(v);
      }}>
        <SelectTrigger className="h-11 rounded-xl border-border">
          <SelectValue placeholder="선택" />
        </SelectTrigger>
        <SelectContent position="popper" className="z-[9999] max-h-60 overflow-y-auto">
          {categories.length === 0 ? (
            <SelectItem value="__empty" disabled>카테고리 없음</SelectItem>
          ) : (
            categories.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))
          )}
          <div className="border-t border-border mt-1 pt-1">
            <SelectItem value="__add_new" className="text-primary font-medium">
              <span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> 새 카테고리 추가</span>
            </SelectItem>
          </div>
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>새 카테고리 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="카테고리 이름"
              className="h-11 rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createMutation.isPending}>
              {createMutation.isPending ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CategorySelect;
