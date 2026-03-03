"use client";

import { useState, useCallback } from "react";
import { CompaniesTable } from "./companies-table";
import { CreateCompanyPanel } from "./create-company-panel";
import { EditCompanyPanel } from "./edit-company-panel";
import { type CompanyWithMemberCount } from "@/server/actions/companies";

interface CompaniesPageClientProps {
  companies: CompanyWithMemberCount[];
  stats: {
    totalCompanies: number;
    usersWithCompany: number;
  };
}

export function CompaniesPageClient({
  companies,
  stats,
}: CompaniesPageClientProps) {
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editCompany, setEditCompany] =
    useState<CompanyWithMemberCount | null>(null);

  const handleOpenCreate = useCallback(() => {
    setShowCreatePanel(true);
  }, []);

  const handleCloseCreate = useCallback(() => {
    setShowCreatePanel(false);
  }, []);

  const handleOpenEdit = useCallback((company: CompanyWithMemberCount) => {
    setEditCompany(company);
    setShowEditPanel(true);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setShowEditPanel(false);
    setEditCompany(null);
  }, []);

  return (
    <>
      <CompaniesTable
        companies={companies}
        stats={stats}
        onCreateCompany={handleOpenCreate}
        onEditCompany={handleOpenEdit}
      />

      <CreateCompanyPanel
        isOpen={showCreatePanel}
        onClose={handleCloseCreate}
      />

      <EditCompanyPanel
        isOpen={showEditPanel}
        onClose={handleCloseEdit}
        company={editCompany}
      />
    </>
  );
}
