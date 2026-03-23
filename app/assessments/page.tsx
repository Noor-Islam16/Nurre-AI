// app / assessments / page.tsx;
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AssessmentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profile?tab=assessments");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to My Profile...</p>
      </div>
    </div>
  );
}
