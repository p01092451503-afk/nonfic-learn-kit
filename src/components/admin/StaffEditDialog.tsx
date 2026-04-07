import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type StaffRole = "admin" | "teacher" | "student" | "super_admin";

export interface StaffEditDraft {
  userId: string;
  name: string;
  role: Exclude<StaffRole, "super_admin">;
  departmentId: string;
  position: string;
  roleLocked: boolean;
}

interface DepartmentOption {
  id: string;
  name: string;
  name_en: string | null;
}

interface StaffEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: StaffEditDraft | null;
  onDraftChange: (draft: StaffEditDraft | null) => void;
  departments: DepartmentOption[];
  isEn: boolean;
  onSave: () => void;
  saving: boolean;
}

const StaffEditDialog = ({
  open,
  onOpenChange,
  draft,
  onDraftChange,
  departments,
  isEn,
  onSave,
  saving,
}: StaffEditDialogProps) => {
  const { t } = useTranslation();

  if (!draft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("admin.editStaff")}</DialogTitle>
          <DialogDescription>{t("admin.editStaffDesc", { name: draft.name })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("admin.departmentColumn")}</Label>
            <Select
              value={draft.departmentId}
              onValueChange={(departmentId) => onDraftChange({ ...draft, departmentId })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("admin.selectDept")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">-</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {isEn ? department.name_en || department.name : department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("admin.roleColumn")}</Label>
            <Select
              disabled={draft.roleLocked}
              value={draft.role}
              onValueChange={(role) => onDraftChange({ ...draft, role: role as StaffEditDraft["role"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">{t("roles.studentLabel")}</SelectItem>
                <SelectItem value="teacher">{t("roles.teacherLabel")}</SelectItem>
                <SelectItem value="admin">{t("roles.adminLabel")}</SelectItem>
              </SelectContent>
            </Select>
            {draft.roleLocked && <p className="text-xs text-muted-foreground">{t("admin.roleLockedHint")}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t("admin.positionColumn")}</Label>
            <Input
              value={draft.position}
              onChange={(event) => onDraftChange({ ...draft, position: event.target.value })}
              placeholder={t("admin.positionColumn")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? t("common.processing") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StaffEditDialog;