"use server";

import { verifyPayrollProvider } from "@/lib/payroll-provider/verify";
import {
  createPayPeriod as adminCreatePayPeriod,
  deletePayPeriod as adminDeletePayPeriod,
  lockPayPeriod as adminLockPayPeriod,
  calculatePayroll as adminCalculatePayroll,
  approvePayroll as adminApprovePayroll,
  exportPayrollCSV as adminExportPayrollCSV,
  generatePayrollReport as adminGenerateReport,
  generatePayStubs as adminGenerateStubs,
} from "@/app/admin/payroll/actions";

async function verifyPayPeriodInOrg(admin: any, payPeriodId: string, orgId: string) {
  const { data: pp } = await admin.from("pay_periods").select("organization_id").eq("id", payPeriodId).single();
  if (pp?.organization_id !== orgId) throw new Error("Pay period does not belong to this organization");
}

export async function createPayPeriod(input: { organizationId: string; startDate: string; endDate: string }) {
  try {
    await verifyPayrollProvider(input.organizationId);
    return await adminCreatePayPeriod(input);
  } catch (e: any) {
    return { success: false as const, error: e.message ?? "Unauthorized" };
  }
}

export async function deletePayPeriod(payPeriodId: string, organizationId: string) {
  try {
    const { admin } = await verifyPayrollProvider(organizationId);
    await verifyPayPeriodInOrg(admin, payPeriodId, organizationId);
    return await adminDeletePayPeriod(payPeriodId);
  } catch (e: any) {
    return { success: false as const, error: e.message ?? "Unauthorized" };
  }
}

export async function lockPayPeriod(payPeriodId: string, organizationId: string) {
  try {
    const { admin } = await verifyPayrollProvider(organizationId);
    await verifyPayPeriodInOrg(admin, payPeriodId, organizationId);
    return await adminLockPayPeriod(payPeriodId);
  } catch (e: any) {
    return { success: false as const, error: e.message ?? "Unauthorized" };
  }
}

export async function calculatePayroll(input: {
  payPeriodId: string;
  organizationId: string;
  startDate: string;
  endDate: string;
  overtimeThreshold: number;
  overtimeMultiplier: number;
  payPeriodType: string;
  stateTaxRate?: number;
}) {
  try {
    const { admin } = await verifyPayrollProvider(input.organizationId);
    await verifyPayPeriodInOrg(admin, input.payPeriodId, input.organizationId);
    return await adminCalculatePayroll(input);
  } catch (e: any) {
    return { success: false as const, error: e.message ?? "Unauthorized" };
  }
}

export async function approvePayroll(input: { payPeriodId: string; organizationId: string; entries: any[] }) {
  try {
    const { admin } = await verifyPayrollProvider(input.organizationId);
    await verifyPayPeriodInOrg(admin, input.payPeriodId, input.organizationId);
    return await adminApprovePayroll(input);
  } catch (e: any) {
    return { success: false as const, error: e.message ?? "Unauthorized" };
  }
}

export async function exportPayrollCSV(payPeriodId: string, organizationId: string) {
  try {
    const { admin } = await verifyPayrollProvider(organizationId);
    await verifyPayPeriodInOrg(admin, payPeriodId, organizationId);
    return await adminExportPayrollCSV(payPeriodId);
  } catch (e: any) {
    return { success: false as const, error: e.message ?? "Unauthorized" };
  }
}

export async function generatePayrollReport(payPeriodId: string, organizationId: string) {
  try {
    const { admin } = await verifyPayrollProvider(organizationId);
    await verifyPayPeriodInOrg(admin, payPeriodId, organizationId);
    return await adminGenerateReport(payPeriodId);
  } catch (e: any) {
    return { success: false as const, error: e.message ?? "Unauthorized" };
  }
}

export async function generatePayStubs(payPeriodId: string, organizationId: string) {
  try {
    const { admin } = await verifyPayrollProvider(organizationId);
    await verifyPayPeriodInOrg(admin, payPeriodId, organizationId);
    return await adminGenerateStubs(payPeriodId);
  } catch (e: any) {
    return { success: false as const, error: e.message ?? "Unauthorized" };
  }
}
