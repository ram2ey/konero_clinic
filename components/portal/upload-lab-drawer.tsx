"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LabUploader } from "@/components/LabUploader";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

export function UploadLabDrawer({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button type="button" size="sm">
          <Upload className="size-3.5" />
          Upload new lab scan
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Upload a lab scan</DrawerTitle>
          <DrawerDescription>PDF, JPEG, or PNG. Photos are compressed automatically.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">
          <LabUploader
            patientId={patientId}
            onUploaded={() => {
              setOpen(false);
              // The upload action already revalidates the /portal path
              // server-side; this triggers this already-mounted route to
              // actually re-fetch its Server Components now.
              router.refresh();
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
