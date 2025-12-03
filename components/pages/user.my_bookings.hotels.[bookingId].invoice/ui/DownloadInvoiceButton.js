"use client";
import { Button } from "@/components/ui/button";

export default function DownloadInvoiceButton({ documentId, bookingId }) {
  function handleDownload(documentId, bookingId, e) {
    e.target.disabled = true;
    // Download functionality removed - html2canvas and related packages were removed
    alert("Download functionality has been disabled.");
    e.target.disabled = false;
  }

  return (
    <Button onClick={(e) => handleDownload(documentId, bookingId, e)} disabled>
      Download Invoice (Disabled)
    </Button>
  );
}
