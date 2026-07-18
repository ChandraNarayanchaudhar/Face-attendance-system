"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { apiPatch } from "@/lib/api";
import { validateAndResizeImage, getImagePreviewUrl } from "@/lib/image-utils";
import { getAvatarUrl, getInitials } from "@/lib/utils";

export default function TeacherProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = React.useState(() => user?.name ?? "");
  const [email] = React.useState(() => user?.email ?? "");
  const [phone_number, setPhoneNumber] = React.useState(
    () => user?.phone_number ?? "",
  );
  const [department, setDepartment] = React.useState(() =>
    user?.role === "teacher" ? (user?.department ?? "") : "",
  );
  const [profileImage, setProfileImage] = React.useState(
    () => user?.profile_image ?? "",
  );
  const [imageError, setImageError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  async function save() {
    if (!user) return;
    setIsSaving(true);
    setImageError("");
    try {
      const updated = await apiPatch<{
        name: string;
        phone_number?: string;
        department?: string;
        profile_image?: string;
      }>(`/teachers/${user.id}`, {
        name,
        phone_number,
        department,
        profile_image: profileImage || undefined,
      });
      setMessage("Profile updated successfully.");
      setName(updated.name);
      setPhoneNumber(updated.phone_number || "");
      setDepartment(updated.department || "");
      setProfileImage(updated.profile_image || "");
      const updatedUser = {
        ...user,
        name: updated.name,
        phone_number: updated.phone_number || user.phone_number,
        department: updated.department || user.department,
        profile_image: updated.profile_image || user.profile_image,
      };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Unable to save profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setIsEditing(false);
    setName(user?.name ?? "");
    setPhoneNumber(user?.phone_number ?? "");
    setDepartment(user?.department ?? "");
    setProfileImage(user?.profile_image ?? "");
    setImageError("");
    setMessage("");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="View your account details." />
      <Card className="shadow-sm">
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={
                  profileImage
                    ? getImagePreviewUrl(profileImage)
                    : (getAvatarUrl(user?.name ?? "") ?? undefined)
                }
                alt={user?.name ?? "Profile"}
              />
              <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xl font-semibold text-foreground">
                {user?.name}
              </div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={email} disabled />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone number</label>
              <Input
                type="tel"
                placeholder="e.g. +977 1234567890"
                value={phone_number}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Profile photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  if (!file) return;
                  setImageError("");
                  const { error, base64 } = await validateAndResizeImage(file);
                  if (error) {
                    setImageError(error);
                    return;
                  }
                  setProfileImage(base64 ?? "");
                }}
                disabled={!isEditing}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
              {imageError && (
                <div className="text-xs text-destructive">{imageError}</div>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Department</label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>
          {message && (
            <div className="text-sm text-muted-foreground">{message}</div>
          )}
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button onClick={save} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save profile"}
                </Button>
                <Button variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Edit profile</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
