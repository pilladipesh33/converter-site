"use client";

import React, { useCallback, useState } from "react";
import { toast, Toaster } from "sonner";
import { FileInfo } from "../types/file";
import { isValidFileType, formatFileSize } from "../utils/file";
import { FileUploadZone } from "./file-upload-zone";
import { FileList } from "./file-list";
import { ErrorMessage } from "./error-message";

export const FileUpload: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulateUpload = (fileInfo: FileInfo) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setFiles((prevFiles) =>
        prevFiles.map((f) => (f.id === fileInfo.id ? { ...f, progress } : f)),
      );

      if (progress === 100) {
        clearInterval(interval);
        toast.success(`${fileInfo.name} uploaded successfully!`);
      }
    }, 500);
  };

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: FileInfo[] = [];
    let hasError = false;

    Array.from(fileList).forEach((file) => {
      const fileType = isValidFileType(file);
      if (fileType === "invalid") {
        hasError = true;
        setError("Only image and video files are allowed");
        return;
      }

      const fileInfo: FileInfo = {
        id: crypto.randomUUID(),
        name: file.name,
        type: fileType,
        size: formatFileSize(file.size),
        progress: 0,
      };

      newFiles.push(fileInfo);
    });

    if (!hasError) {
      setError(null);
      setFiles((prev) => [...prev, ...newFiles]);
      newFiles.forEach((file) => {
        simulateUpload(file);
      });
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles],
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    toast.info("File removed");
  };

  return (
    <div className="max-w-2xl my-auto mx-auto p-6">
      <Toaster position="top-right" />
      <FileUploadZone
        isDragging={isDragging}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onFileSelect={handleFileSelect}
      />
      <ErrorMessage message={error} />
      <FileList files={files} onRemove={removeFile} />
    </div>
  );
};
