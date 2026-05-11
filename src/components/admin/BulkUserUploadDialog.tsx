import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
  name_en?: string | null;
  code?: string | null;
  parent_department_id?: string | null;
}

interface ParsedRow {
  rowIndex: number;
  name: string;
  email: string;
  password: string;
  role: string;
  branchCode: string;
  departmentName: string;
}

interface ResultRow extends ParsedRow {
  status: "pending" | "success" | "error";
  message?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  onCompleted: () => void;
}

const ROLE_MAP: Record<string, string> = {
  학습자: "student",
  강사: "teacher",
  관리자: "admin",
  student: "student",
  teacher: "teacher",
  admin: "admin",
};

const HEADERS = ["이름", "이메일", "비밀번호", "역할", "지점코드", "부서명"];

const BulkUserUploadDialog = ({ open, onOpenChange, departments, onCompleted }: Props) => {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const sample = [
      HEADERS,
      ["홍길동", "hong@example.com", "Temp1234!", "학습자", "SEOUL", "영업1팀"],
      ["김영희", "kim@example.com", "Temp1234!", "강사", "BUSAN", ""],
      ["박철수", "park@example.com", "Temp1234!", "관리자", "", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sample);
    ws["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "직원");
    XLSX.writeFile(wb, "직원_대량등록_양식.xlsx");
  };

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (data.length < 2) {
        toast.error("엑셀에 데이터가 없습니다.");
        return;
      }
      const parsed: ResultRow[] = [];
      for (let i = 1; i < data.length; i++) {
        const r = data[i];
        if (!r || r.every((v) => String(v ?? "").trim() === "")) continue;
        parsed.push({
          rowIndex: i + 1,
          name: String(r[0] ?? "").trim(),
          email: String(r[1] ?? "").trim(),
          password: String(r[2] ?? "").trim(),
          role: String(r[3] ?? "").trim(),
          branchCode: String(r[4] ?? "").trim(),
          departmentName: String(r[5] ?? "").trim(),
          status: "pending",
        });
      }
      setRows(parsed);
      setProgress(0);
    } catch (err: any) {
      toast.error("파일을 읽을 수 없습니다: " + err.message);
    }
  };

  const resolveDepartmentId = (branchCode: string, departmentName: string): { id: string | null; error?: string } => {
    if (!branchCode && !departmentName) return { id: null };
    const branches = departments.filter((d) => !d.parent_department_id);
    let branch: Department | undefined;
    if (branchCode) {
      branch = branches.find((d) => (d.code || "").toLowerCase() === branchCode.toLowerCase());
      if (!branch) return { id: null, error: `지점코드 '${branchCode}' 없음` };
    }
    if (!departmentName) return { id: branch?.id ?? null };
    const team = departments.find(
      (d) =>
        d.parent_department_id === branch?.id &&
        (d.name === departmentName || d.name_en === departmentName)
    );
    if (!team) return { id: null, error: `부서 '${departmentName}' 없음` };
    return { id: team.id };
  };

  const validateRow = (r: ResultRow): string | null => {
    if (!r.name) return "이름 누락";
    if (!r.email || !/^\S+@\S+\.\S+$/.test(r.email)) return "이메일 형식 오류";
    if (!r.password || r.password.length < 6) return "비밀번호 6자 이상";
    if (!ROLE_MAP[r.role]) return `역할 '${r.role}' 잘못됨`;
    return null;
  };

  const startUpload = async () => {
    if (rows.length === 0) return;
    setProcessing(true);
    const updated = [...rows];
    for (let i = 0; i < updated.length; i++) {
      const r = updated[i];
      const validationError = validateRow(r);
      if (validationError) {
        updated[i] = { ...r, status: "error", message: validationError };
        setRows([...updated]);
        setProgress(Math.round(((i + 1) / updated.length) * 100));
        continue;
      }
      const { id: deptId, error: deptErr } = resolveDepartmentId(r.branchCode, r.departmentName);
      if (deptErr) {
        updated[i] = { ...r, status: "error", message: deptErr };
        setRows([...updated]);
        setProgress(Math.round(((i + 1) / updated.length) * 100));
        continue;
      }
      try {
        const { data, error } = await supabase.functions.invoke("create-user", {
          body: {
            email: r.email,
            password: r.password,
            fullName: r.name,
            role: ROLE_MAP[r.role],
            departmentId: deptId || undefined,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        updated[i] = { ...r, status: "success", message: "등록 완료" };
      } catch (err: any) {
        updated[i] = { ...r, status: "error", message: err.message || "오류" };
      }
      setRows([...updated]);
      setProgress(Math.round(((i + 1) / updated.length) * 100));
    }
    setProcessing(false);
    const successCount = updated.filter((r) => r.status === "success").length;
    toast.success(`${successCount}/${updated.length}명 등록 완료`);
    if (successCount > 0) onCompleted();
  };

  const successCount = rows.filter((r) => r.status === "success").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!processing) {
          if (!v) reset();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> 직원 대량 등록
          </DialogTitle>
          <DialogDescription>
            엑셀 양식을 다운로드 후 작성하여 업로드하면 한 번에 직원을 등록할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border p-4 bg-muted/30 text-xs space-y-2">
            <p className="font-medium text-foreground">작성 안내</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>역할: 학습자 / 강사 / 관리자 중 하나</li>
              <li>지점코드: 지점 관리에서 등록된 코드 (예: SEOUL). 본사/미배정 시 비워둠</li>
              <li>부서명: 지점 하위 팀명. 지점 자체로 배정 시 비워둠</li>
              <li>비밀번호: 6자 이상. 등록 후 사용자에게 별도 안내 필요</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl gap-2" onClick={downloadTemplate}>
              <Download className="h-4 w-4" /> 양식 다운로드
            </Button>
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
            >
              <Upload className="h-4 w-4" /> 엑셀 업로드
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>총 {rows.length}건 · 성공 {successCount} · 실패 {errorCount}</span>
                {processing && <span>{progress}%</span>}
              </div>
              {processing && <Progress value={progress} className="h-2" />}

              <div className="border border-border rounded-xl overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">이름</th>
                        <th className="text-left px-3 py-2 font-medium">이메일</th>
                        <th className="text-left px-3 py-2 font-medium">역할</th>
                        <th className="text-left px-3 py-2 font-medium">소속</th>
                        <th className="text-left px-3 py-2 font-medium">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{r.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                          <td className="px-3 py-2">{r.role}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {[r.branchCode, r.departmentName].filter(Boolean).join(" / ") || "-"}
                          </td>
                          <td className="px-3 py-2">
                            {r.status === "pending" && <span className="text-muted-foreground">대기</span>}
                            {r.status === "success" && (
                              <span className="inline-flex items-center gap-1 text-primary">
                                <CheckCircle2 className="h-3.5 w-3.5" /> 완료
                              </span>
                            )}
                            {r.status === "error" && (
                              <span className="inline-flex items-center gap-1 text-destructive" title={r.message}>
                                <XCircle className="h-3.5 w-3.5" /> {r.message}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" className="rounded-xl" onClick={reset} disabled={processing}>
                  초기화
                </Button>
                <Button className="rounded-xl gap-2" onClick={startUpload} disabled={processing}>
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> 등록 중...
                    </>
                  ) : (
                    <>등록 시작 ({rows.length}건)</>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUserUploadDialog;