import React from "react";
import { DataTable } from "@/components/table/data-table";
import { columns } from "@/components/table/table-column";
import { getAllEvidenceMeta } from "@/utils";

export default async function page() {
  const evidence = await getAllEvidenceMeta();

  return (
    <main>
      <div className="container mx-auto p-4">
        <DataTable data={evidence} columns={columns} />
      </div>
    </main>
  );
}
