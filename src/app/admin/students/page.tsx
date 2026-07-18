"use client";

import * as React from "react";
import { Pencil, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiGet, apiPatch } from "@/lib/api";
import { validateAndResizeImage, getImagePreviewUrl } from "@/lib/image-utils";
import { useWebSocket } from "@/hooks/useWebSocket";

const badgeVariant = (status: string) =>
  status === "Registered"
    ? "success"
    : status === "Pending"
      ? "warning"
      : "secondary";

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  profile_image?: string;
  section?: string;
  semester?: string;
  overall_attendance_pct: number;
  face_data_status: string;
  is_active: boolean;
  created_at?: string | Date;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = React.useState<StudentProfile[]>([]);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(12);
  const [sortBy, setSortBy] = React.useState("name");
  const [order, setOrder] = React.useState<"asc" | "desc">("asc");
  const [faceStatus, setFaceStatus] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [searching, setSearching] = React.useState(false);
  const [editingStudent, setEditingStudent] =
    React.useState<StudentProfile | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  async function load(query = "", pageParam = page, perPageParam = perPage) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      if (faceStatus) params.set("face_status", faceStatus);
      params.set("page", String(pageParam));
      params.set("per_page", String(perPageParam));
      params.set("sort_by", sortBy);
      params.set("order", order);
      const path = `/students?${params.toString()}`;
      const resp = await apiGet<{ items: StudentProfile[]; total: number }>(
        path,
      );
      setStudents(resp.items);
      setTotal(resp.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    async function initialize() {
      await load(search, 1, perPage);
    }
    initialize();
  }, []);

  // Listen for live updates when a student's face data changes (e.g. after training)
  useWebSocket({
    onEvent: (event: any) => {
      if (!event) return;
      if (event.type === "student_updated") {
        // Refresh current page to show updated status
        load(search.trim(), page, perPage);
      }
    },
  });

  const onSearch = async () => {
    setSearching(true);
    setPage(1);
    await load(search.trim(), 1, perPage);
    setSearching(false);
  };

  const changePage = async (next: number) => {
    setPage(next);
    await load(search.trim(), next, perPage);
  };

  const changeSort = async (field: string) => {
    const nextOrder = sortBy === field && order === "asc" ? "desc" : "asc";
    setSortBy(field);
    setOrder(nextOrder);
    setPage(1);
    await load(search.trim(), 1, perPage);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Search students by name, section, semester, email or ID."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch();
              }}
            />
            <Button onClick={onSearch} disabled={searching}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
            <Select
              value={faceStatus ?? ""}
              onChange={(e) => {
                const v = e.target.value || null;
                setFaceStatus(v);
                setPage(1);
                load(search.trim(), 1, perPage);
              }}
            >
              <option value="">All statuses</option>
              <option value="Registered">Registered</option>
              <option value="Pending">Pending</option>
              <option value="Missing">Missing</option>
            </Select>
            <Button
              onClick={() => {
                setFaceStatus("Pending");
                setPage(1);
                load(search.trim(), 1, perPage);
              }}
            >
              Show
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="p-8 text-muted-foreground">Loading students...</div>
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted p-8 text-sm text-muted-foreground">
          No students found. Try a different search term or clear the filter.
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {students.map((student) => (
              <Card key={student.id} className="shadow-sm">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {student.profile_image ? (
                        <img
                          src={getImagePreviewUrl(student.profile_image)}
                          alt={student.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                          {student.name
                            .split(" ")
                            .filter(Boolean)
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          {student.name}
                        </CardTitle>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {student.section || "No section"} •{" "}
                          {student.semester || "No semester"}
                        </div>
                      </div>
                    </div>
                    <Badge variant={badgeVariant(student.face_data_status)}>
                      {student.face_data_status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span>{student.email}</span>
                      {student.phone_number && <span>•</span>}
                      {student.phone_number && (
                        <span>{student.phone_number}</span>
                      )}
                      <span>•</span>
                      <span>{student.is_active ? "Active" : "Inactive"}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Edit student"
                      onClick={() => setEditingStudent(student)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-1 text-sm">
                    <div className="text-muted-foreground">
                      Overall attendance
                    </div>
                    <div className="font-medium">
                      {student.overall_attendance_pct ?? 0}%
                    </div>
                  </div>
                  <div className="grid gap-1 text-sm">
                    <div className="text-muted-foreground">Student ID</div>
                    <div className="font-medium break-words">{student.id}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between pt-6">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((page - 1) * perPage + 1, total)}–
              {Math.min(page * perPage, total)} of {total} students
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onChange={(e) => changeSort(e.target.value)}
              >
                <option value="name">Name</option>
                <option value="id">ID</option>
                <option value="attendance">Attendance</option>
                <option value="created">Created</option>
              </Select>
              <Button
                onClick={() => changePage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <Button
                onClick={() => changePage(page + 1)}
                disabled={page * perPage >= total}
              >
                Next
              </Button>
            </div>
          </div>

          <Dialog
            open={!!editingStudent}
            onOpenChange={(open) => {
              if (!open) setEditingStudent(null);
            }}
          >
            <DialogContent className="max-h-[70vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit student profile</DialogTitle>
                <DialogDescription>
                  Update student details and save them to the database.
                </DialogDescription>
              </DialogHeader>

              {editingStudent && (
                <div className="grid gap-4 py-2">
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Student ID</label>
                    <div className="text-sm text-muted-foreground break-words">
                      {editingStudent.id}
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">
                      Account status
                    </label>
                    <div className="text-sm text-muted-foreground">
                      {editingStudent.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Created at</label>
                    <div className="text-sm text-muted-foreground">
                      {editingStudent.created_at
                        ? new Date(editingStudent.created_at).toLocaleString()
                        : "-"}
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">
                      Overall attendance
                    </label>
                    <div className="text-sm font-medium">
                      {editingStudent.overall_attendance_pct ?? 0}%
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={editingStudent.name}
                      onChange={(e) =>
                        setEditingStudent((prev) =>
                          prev ? { ...prev, name: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      value={editingStudent.email}
                      onChange={(e) =>
                        setEditingStudent((prev) =>
                          prev ? { ...prev, email: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Phone number</label>
                    <Input
                      type="tel"
                      placeholder="e.g. +977 1234567890"
                      value={editingStudent.phone_number ?? ""}
                      onChange={(e) =>
                        setEditingStudent((prev) =>
                          prev
                            ? { ...prev, phone_number: e.target.value }
                            : prev,
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Profile photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.currentTarget.files?.[0];
                        if (!file) return;
                        const { error, base64 } =
                          await validateAndResizeImage(file);
                        if (error) {
                          setSaveError(error);
                          return;
                        }
                        setSaveError(null);
                        setEditingStudent((prev) =>
                          prev
                            ? { ...prev, profile_image: base64 ?? "" }
                            : prev,
                        );
                      }}
                      className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    />
                    {editingStudent?.profile_image && (
                      <img
                        src={getImagePreviewUrl(editingStudent.profile_image)}
                        alt="Profile preview"
                        className="mt-3 h-24 w-24 rounded-2xl object-cover"
                      />
                    )}
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Section</label>
                    <Input
                      value={editingStudent.section ?? ""}
                      onChange={(e) =>
                        setEditingStudent((prev) =>
                          prev ? { ...prev, section: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Semester</label>
                    <Input
                      value={editingStudent.semester ?? ""}
                      onChange={(e) =>
                        setEditingStudent((prev) =>
                          prev ? { ...prev, semester: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Face status</label>
                    <Select
                      value={editingStudent.face_data_status}
                      onChange={(e) =>
                        setEditingStudent((prev) =>
                          prev
                            ? { ...prev, face_data_status: e.target.value }
                            : prev,
                        )
                      }
                    >
                      <option value="Registered">Registered</option>
                      <option value="Pending">Pending</option>
                      <option value="Missing">Missing</option>
                    </Select>
                  </div>
                  {saveError && (
                    <div className="text-sm text-destructive">{saveError}</div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setEditingStudent(null)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!editingStudent) return;
                    setIsSaving(true);
                    setSaveError(null);
                    try {
                      const updated = await apiPatch<StudentProfile>(
                        `/students/${editingStudent.id}`,
                        {
                          name: editingStudent.name,
                          email: editingStudent.email,
                          phone_number: editingStudent.phone_number,
                          profile_image: editingStudent.profile_image,
                          section: editingStudent.section,
                          semester: editingStudent.semester,
                          face_data_status: editingStudent.face_data_status,
                        },
                      );
                      setStudents((current) =>
                        current.map((student) =>
                          student.id === updated.id ? updated : student,
                        ),
                      );
                      setEditingStudent(updated);
                      setEditingStudent(null);
                    } catch (error) {
                      setSaveError(
                        error instanceof Error
                          ? error.message
                          : "Unable to save student profile.",
                      );
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
