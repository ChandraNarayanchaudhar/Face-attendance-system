// Image utilities for profile photos — validation, resizing, base64 encoding

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const PROFILE_PHOTO_SIZE = 400; // 400x400 pixels

export async function validateAndResizeImage(
  file: File,
): Promise<{ error?: string; base64?: string }> {
  // Validate file type
  if (!file.type.startsWith("image/")) {
    return { error: "File must be an image" };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      error: `Image must be less than 5MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  try {
    // Read file as data URL
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Create image element to resize
    const img = new Image();
    img.src = dataUrl;

    const base64 = await new Promise<string>((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = PROFILE_PHOTO_SIZE;
        canvas.height = PROFILE_PHOTO_SIZE;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Draw image centered and cropped to square
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;

        ctx.drawImage(
          img,
          x,
          y,
          size,
          size,
          0,
          0,
          PROFILE_PHOTO_SIZE,
          PROFILE_PHOTO_SIZE,
        );

        const resized = canvas.toDataURL("image/jpeg", 0.85);
        resolve(resized);
      };
      img.onerror = reject;
    });

    return { base64 };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to process image",
    };
  }
}

export function getImagePreviewUrl(base64: string | null | undefined): string {
  if (!base64) return "";
  if (base64.startsWith("data:")) return base64;
  return `data:image/jpeg;base64,${base64}`;
}
