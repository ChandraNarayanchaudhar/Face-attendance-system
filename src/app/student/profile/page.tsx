"use client";

// Student profile — real logged-in student details from database

import * as React from "react";
import { Mail, User } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { apiGet, apiPatch } from "@/lib/api";
import { validateAndResizeImage, getImagePreviewUrl } from "@/lib/image-utils";
import { getAvatarUrl, getInitials } from "@/lib/utils";

export default function StudentProfilePage() {
  const user = useAuthStore((s) => s.user);

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
  }

  const [profile, setProfile] = React.useState<StudentProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isEditing, setIsEditing] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [section, setSection] = React.useState("");
  const [semester, setSemester] = React.useState("");
  const [profileImage, setProfileImage] = React.useState("");
  const [imageError, setImageError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const response = await apiGet<StudentProfile>(`/students/${user.id}`);
        setProfile(response);
        setName(response.name);
        setPhoneNumber(response.phone_number ?? "");
        setSection(response.section ?? "");
        setSemester(response.semester ?? "");
        setProfileImage(response.profile_image ?? "");
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  async function saveProfile() {
    if (!user || !profile) return;
    setIsSaving(true);
    setImageError("");
    setMessage("");
    try {
      const updated = await apiPatch<StudentProfile>(`/students/${user.id}`, {
        name,
        phone_number: phoneNumber || undefined,
        section: section || undefined,
        semester: semester || undefined,
        profile_image: profileImage || undefined,
      });
      setProfile(updated);
      setName(updated.name);
      setPhoneNumber(updated.phone_number ?? "");
      setSection(updated.section ?? "");
      setSemester(updated.semester ?? "");
      setProfileImage(updated.profile_image ?? "");
      setMessage("Profile saved successfully.");
      setIsEditing(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function faceBadge(status: string) {
    if (status === "Registered")
      return <Badge variant="success">✓ Registered for face recognition</Badge>;
    if (status === "Pending")
      return (
        <Badge variant="warning">Pending — contact admin to register</Badge>
      );
    return <Badge variant="destructive">Missing — contact admin</Badge>;
  }

  if (loading)
    return <div className="p-8 text-muted-foreground">Loading profile...</div>;
  if (!profile)
    return <div className="p-8 text-muted-foreground">Profile not found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Your student details from the database."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Student info */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Student information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={
                    profileImage
                      ? getImagePreviewUrl(profileImage)
                      : (getAvatarUrl(profile.name) ?? undefined)
                  }
                  alt={profile.name}
                />
                <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-lg font-semibold text-foreground">
                  {profile.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {profile.email}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Student ID", value: profile.id },
                { label: "Semester", value: profile.semester || "—" },
                { label: "Section", value: profile.section || "—" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border bg-muted/20 p-4"
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm font-semibold">{item.value}</div>
                </div>
              ))}

              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="text-xs font-medium text-muted-foreground">
                  Phone
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {profile.phone_number || "—"}
                </div>
              </div>

              {/* Email */}
              <div className="rounded-2xl border bg-muted/20 p-4 sm:col-span-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Mail className="h-3 w-3" /> Email
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {profile.email}
                </div>
              </div>
            </div>

            {isEditing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full name</label>
                  <Input
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setName(e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone number</label>
                  <Input
                    value={phoneNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPhoneNumber(e.target.value)
                    }
                    type="tel"
                    placeholder="e.g. +977 1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Section</label>
                  <Input
                    value={section}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSection(e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Semester</label>
                  <Input
                    value={semester}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSemester(e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Profile photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.currentTarget.files?.[0];
                      if (!file) return;
                      setImageError("");
                      const { error, base64 } =
                        await validateAndResizeImage(file);
                      if (error) {
                        setImageError(error);
                        return;
                      }
                      setProfileImage(base64 ?? "");
                    }}
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                  {imageError && (
                    <div className="text-xs text-destructive">{imageError}</div>
                  )}
                  {profileImage && (
                    <img
                      src={getImagePreviewUrl(profileImage)}
                      alt="Selected profile"
                      className="mt-3 h-24 w-24 rounded-2xl object-cover"
                    />
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Face registration status */}
                <div className="rounded-2xl border bg-muted/20 p-4 sm:col-span-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Face Registration (CCTV)
                  </div>
                  {faceBadge(profile.face_data_status)}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Face registration is required for automatic attendance via
                    CCTV cameras.
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Update your profile and phone / image to keep attendance records
            current.
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button onClick={saveProfile} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save profile"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setMessage("");
                    setImageError("");
                    if (profile) {
                      setName(profile.name);
                      setPhoneNumber(profile.phone_number ?? "");
                      setSection(profile.section ?? "");
                      setSemester(profile.semester ?? "");
                      setProfileImage(profile.profile_image ?? "");
                    }
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Edit profile</Button>
            )}
          </div>
        </div>
        {message && (
          <div className="text-sm text-muted-foreground">{message}</div>
        )}
        {/* Attendance */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Overall attendance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <div className="text-sm text-muted-foreground">Overall %</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-4xl font-bold">
                  {profile.overall_attendance_pct}%
                </div>
                <Badge
                  variant={
                    profile.overall_attendance_pct >= 75 ? "success" : "warning"
                  }
                >
                  {profile.overall_attendance_pct >= 75
                    ? "Good standing"
                    : "Below threshold"}
                </Badge>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-3 w-full rounded-full bg-muted">
                <div
                  className={`h-3 rounded-full ${
                    profile.overall_attendance_pct >= 75
                      ? "bg-primary"
                      : "bg-yellow-500"
                  }`}
                  style={{ width: `${profile.overall_attendance_pct}%` }}
                />
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                Minimum required: 75%. Current:{" "}
                {profile.overall_attendance_pct >= 75
                  ? `${(profile.overall_attendance_pct - 75).toFixed(1)}% above minimum`
                  : `${(75 - profile.overall_attendance_pct).toFixed(1)}% below minimum`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
