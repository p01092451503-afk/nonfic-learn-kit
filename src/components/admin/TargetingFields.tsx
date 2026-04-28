import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TargetingValue {
  countries: string[];
  branchIds: string[];
  courseIds: string[];
}

interface TargetingFieldsProps {
  value: TargetingValue;
  onChange: (next: TargetingValue) => void;
  /** When true, renders a tighter layout for compact dialogs */
  compact?: boolean;
}

const TargetingFields = ({ value, onChange, compact }: TargetingFieldsProps) => {
  const [countryDraft, setCountryDraft] = useState("");

  const { data: branches = [] } = useQuery({
    queryKey: ["targeting-branches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departments")
        .select("id, name, code, country, parent_department_id")
        .is("parent_department_id", null)
        .order("display_order")
        .order("name");
      return data || [];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["targeting-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title")
        .order("title");
      return data || [];
    },
  });

  const addCountry = () => {
    const code = countryDraft.trim().toUpperCase();
    if (!code) return;
    if (value.countries.includes(code)) {
      setCountryDraft("");
      return;
    }
    onChange({ ...value, countries: [...value.countries, code] });
    setCountryDraft("");
  };

  const removeCountry = (c: string) =>
    onChange({ ...value, countries: value.countries.filter((x) => x !== c) });

  const toggleBranch = (id: string) => {
    const exists = value.branchIds.includes(id);
    onChange({
      ...value,
      branchIds: exists ? value.branchIds.filter((x) => x !== id) : [...value.branchIds, id],
    });
  };

  const toggleCourse = (id: string) => {
    const exists = value.courseIds.includes(id);
    onChange({
      ...value,
      courseIds: exists ? value.courseIds.filter((x) => x !== id) : [...value.courseIds, id],
    });
  };

  const branchLabel = (id: string) => branches.find((b: any) => b.id === id)?.name || id;
  const courseLabel = (id: string) => courses.find((c: any) => c.id === id)?.title || id;

  const hasNoTarget =
    value.countries.length === 0 && value.branchIds.length === 0 && value.courseIds.length === 0;

  return (
    <div className={cn("space-y-3 rounded-md border border-border bg-muted/30 p-3", compact && "p-2.5 space-y-2.5")}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">대상 설정</Label>
        {hasNoTarget ? (
          <span className="text-[10px] text-destructive">최소 한 가지 대상을 지정하세요</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">선택된 대상에게만 노출됩니다</span>
        )}
      </div>

      {/* Countries */}
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">국가 (예: KR, JP, US)</Label>
        <div className="flex gap-1.5">
          <Input
            value={countryDraft}
            onChange={(e) => setCountryDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCountry();
              }
            }}
            placeholder="국가 코드 입력"
            className="h-8 text-xs uppercase"
            maxLength={5}
          />
          <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={addCountry}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {value.countries.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {value.countries.map((c) => (
              <Badge key={c} variant="secondary" className="text-[10px] gap-1">
                {c}
                <button type="button" onClick={() => removeCountry(c)} className="hover:text-destructive">
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Branches */}
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">조직</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 w-full justify-between text-xs">
              <span>{value.branchIds.length > 0 ? `${value.branchIds.length}개 조직 선택` : "조직 선택"}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="start">
            <ScrollArea className="max-h-[240px]">
              <div className="p-1.5">
                {branches.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">등록된 조직이 없습니다.</p>
                ) : (
                  branches.map((b: any) => (
                    <label
                      key={b.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-xs"
                    >
                      <Checkbox
                        checked={value.branchIds.includes(b.id)}
                        onCheckedChange={() => toggleBranch(b.id)}
                      />
                      <span className="flex-1">{b.name}</span>
                      {b.country && <span className="text-[10px] text-muted-foreground">{b.country}</span>}
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
        {value.branchIds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {value.branchIds.map((id) => (
              <Badge key={id} variant="secondary" className="text-[10px] gap-1">
                {branchLabel(id)}
                <button type="button" onClick={() => toggleBranch(id)} className="hover:text-destructive">
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Courses */}
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">강의</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 w-full justify-between text-xs">
              <span>{value.courseIds.length > 0 ? `${value.courseIds.length}개 강의 선택` : "강의 선택"}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <ScrollArea className="max-h-[280px]">
              <div className="p-1.5">
                {courses.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">등록된 강의가 없습니다.</p>
                ) : (
                  courses.map((c: any) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-xs"
                    >
                      <Checkbox
                        checked={value.courseIds.includes(c.id)}
                        onCheckedChange={() => toggleCourse(c.id)}
                      />
                      <span className="flex-1 line-clamp-1">{c.title}</span>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
        {value.courseIds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {value.courseIds.map((id) => (
              <Badge key={id} variant="secondary" className="text-[10px] gap-1 max-w-[180px]">
                <span className="truncate">{courseLabel(id)}</span>
                <button type="button" onClick={() => toggleCourse(id)} className="hover:text-destructive shrink-0">
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const isTargetingValid = (v: TargetingValue) =>
  v.countries.length > 0 || v.branchIds.length > 0 || v.courseIds.length > 0;

export default TargetingFields;