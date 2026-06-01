"use client";

import Link from "next/link";

import { updatePipelineStatusAction } from "@/features/crm/actions";
import { PIPELINE_COLUMN_COLORS } from "@/lib/crm/constants";
import { CRM_PIPELINE_STATUS_LABELS } from "@/types/crm";
import type { CrmPipelineColumn } from "@/types/crm";
import { CRM_CONTACT_TYPE_LABELS } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CrmPipelineBoard({ columns }: { columns: CrmPipelineColumn[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div
          key={col.status}
          className={`min-w-[240px] flex-1 rounded-lg border-2 p-3 ${PIPELINE_COLUMN_COLORS[col.status] ?? ""}`}
        >
          <h3 className="mb-3 text-sm font-semibold">
            {CRM_PIPELINE_STATUS_LABELS[col.status]}
            <Badge variant="secondary" className="ml-2">
              {col.contacts.length}
            </Badge>
          </h3>
          <div className="space-y-2">
            {col.contacts.map((contact) => (
              <Card key={contact.id} className="shadow-sm">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-sm">
                    <Link href={`/crm/contacts/${contact.id}`} className="hover:underline">
                      {contact.name}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-3 pt-0 text-xs text-muted-foreground">
                  <p>{CRM_CONTACT_TYPE_LABELS[contact.contactType]}</p>
                  {contact.contactPerson ? <p>{contact.contactPerson}</p> : null}
                  <select
                    className="border-input bg-background h-8 w-full rounded-md border px-2 text-xs"
                    defaultValue={contact.pipelineStatus}
                    onChange={(e) => void updatePipelineStatusAction(contact.id, e.target.value)}
                  >
                    {Object.entries(CRM_PIPELINE_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
