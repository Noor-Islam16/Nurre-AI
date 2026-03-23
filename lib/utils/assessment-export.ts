// lib/utils/assessment-export.ts
import type { Assessment, AssessmentResponse } from "@/lib/types/assessment";

interface ExportData {
  assessment: Assessment;
  lastResponse: AssessmentResponse;
  history: AssessmentResponse[];
}

/**
 * Export assessment results as CSV
 */
export function exportAsCSV(data: ExportData): void {
  const { assessment, history } = data;

  // Build CSV header
  const headers = [
    "Date",
    "Time",
    "Score",
    "Severity Level",
    "Time Taken (seconds)",
  ];

  // Build CSV rows
  const rows = history.map((response) => [
    new Date(response.completed_at).toLocaleDateString("en-GB"),
    new Date(response.completed_at).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    response.scores.total?.toString() || "N/A",
    response.severity_level.replace(/_/g, " "),
    response.time_taken?.toString() || "N/A",
  ]);

  // Combine into CSV string
  const csvContent = [
    [`Assessment: ${assessment.name}`],
    [`Export Date: ${new Date().toLocaleDateString("en-GB")}`],
    [],
    headers,
    ...rows,
  ]
    .map((row) => row.join(","))
    .join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${assessment.type}_results_${Date.now()}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export assessment results as PDF (simple text-based PDF for MVP)
 */
export function exportAsPDF(data: ExportData): void {
  const { assessment, lastResponse, history } = data;

  // Create a simple HTML document that can be printed to PDF
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Please allow pop-ups to export as PDF");
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${assessment.name} - Assessment Results</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 40px auto;
          padding: 20px;
          color: #333;
        }
        h1 {
          color: #1f2937;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 10px;
        }
        h2 {
          color: #374151;
          margin-top: 30px;
        }
        .summary {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .summary p {
          margin: 8px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #d1d5db;
          padding: 10px;
          text-align: left;
        }
        th {
          background: #f9fafb;
          font-weight: 600;
        }
        tr:nth-child(even) {
          background: #f9fafb;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #d1d5db;
          font-size: 12px;
          color: #6b7280;
        }
        .severity-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
        }
        .severity-minimal { background: #d1fae5; color: #065f46; }
        .severity-mild { background: #fef3c7; color: #92400e; }
        .severity-moderate { background: #fed7aa; color: #9a3412; }
        .severity-severe { background: #fee2e2; color: #991b1b; }
        @media print {
          body { margin: 0; padding: 20px; }
        }
      </style>
    </head>
    <body>
      <h1>${assessment.name}</h1>

      <div class="summary">
        <h2>Latest Result Summary</h2>
        <p><strong>Date:</strong> ${new Date(
          lastResponse.completed_at,
        ).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}</p>
        <p><strong>Score:</strong> ${lastResponse.scores.total !== undefined ? lastResponse.scores.total : "N/A"}</p>
        <p><strong>Severity Level:</strong>
          <span class="severity-badge severity-${lastResponse.severity_level.toLowerCase().replace(/_/g, "-")}">
            ${lastResponse.severity_level.replace(/_/g, " ")}
          </span>
        </p>
        <p><strong>Time Taken:</strong> ${Math.floor(lastResponse.time_taken / 60)} minutes ${lastResponse.time_taken % 60} seconds</p>
      </div>

      <h2>Assessment History</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Score</th>
            <th>Severity Level</th>
            <th>Time Taken</th>
          </tr>
        </thead>
        <tbody>
          ${history
            .map(
              (response) => `
            <tr>
              <td>${new Date(response.completed_at).toLocaleDateString("en-GB")}</td>
              <td>${new Date(response.completed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</td>
              <td>${response.scores.total !== undefined ? response.scores.total : "N/A"}</td>
              <td>${response.severity_level.replace(/_/g, " ")}</td>
              <td>${Math.floor(response.time_taken / 60)}m ${response.time_taken % 60}s</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div class="footer">
        <p><strong>Disclaimer:</strong> This is a screening tool result and does not constitute a medical diagnosis.
        Please consult with a qualified healthcare professional for proper evaluation and treatment.</p>
        <p><strong>Export Date:</strong> ${new Date().toLocaleDateString(
          "en-GB",
          {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          },
        )}</p>
        <p><strong>Assessment Type:</strong> ${assessment.name} (${assessment.version})</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Auto-print after a short delay to ensure content is loaded
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/**
 * Share assessment results with GP (placeholder for now)
 */
export async function shareWithGP(data: ExportData): Promise<void> {
  // For MVP, we'll just show a confirmation and mark it as shared
  // In production, this would integrate with NHS systems or email

  const confirmed = confirm(
    `Share ${data.assessment.name} results with your GP?\n\n` +
      `This will generate a shareable report that you can provide to your healthcare provider.`,
  );

  if (confirmed) {
    // Generate PDF for sharing
    exportAsPDF(data);

    // In production, you would:
    // 1. Mark the response as shared in the database
    // 2. Generate a unique share code
    // 3. Send via email or integrate with NHS systems
    // 4. Log the sharing event

    alert(
      "Results prepared for sharing. The PDF has been generated and is ready to print or save.",
    );
  }
}
