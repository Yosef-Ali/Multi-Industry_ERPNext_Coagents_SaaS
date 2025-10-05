import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Context7SearchInput } from '../../src/mcp/context7';
import {
  IntrospectDocTypeInput,
  SearchRecordsInput,
  RunReportInput,
} from '../../src/mcp/erpnext';
import { z } from 'zod';
import { ErpNextTools } from '../../src/mcp/erpnext';

describe('MCP tool contracts', () => {
  it('Context7SearchInput validates minimal query', () => {
    const parsed = Context7SearchInput.parse({ query: 'erpnext report' });
    expect(parsed.query).toBe('erpnext report');
    expect(parsed.limit).toBe(10);
  });

  it('IntrospectDocTypeInput requires doctype', () => {
    expect(() => IntrospectDocTypeInput.parse({} as any)).toThrow();
    const parsed = IntrospectDocTypeInput.parse({ doctype: 'Sales Invoice' });
    expect(parsed.doctype).toBe('Sales Invoice');
  });

  it('SearchRecordsInput validates doctype/query and sets default limit', () => {
    const parsed = SearchRecordsInput.parse({ doctype: 'Customer', query: 'Acme' });
    expect(parsed.limit).toBe(20);
  });

  it('RunReportInput validates report_name and accepts optional filters', () => {
    const parsed = RunReportInput.parse({ report_name: 'Sales Register', filters: { company: 'MyCo' } });
    expect(parsed.report_name).toBe('Sales Register');
    expect(parsed.filters?.company).toBe('MyCo');
  });

  it('ListDocTypesInput sets sensible defaults', () => {
    const parsed = ErpNextTools.ListDocTypesInput.parse({});
    expect(parsed.includeChildTables).toBe(false);
    expect(parsed.limit).toBe(100);
  });

  it('ListFieldsInput requires doctype', () => {
    expect(() => ErpNextTools.ListFieldsInput.parse({} as any)).toThrow();
    const parsed = ErpNextTools.ListFieldsInput.parse({ doctype: 'Item' });
    expect(parsed.doctype).toBe('Item');
  });

  it('ListReportsInput default limit set', () => {
    const parsed = ErpNextTools.ListReportsInput.parse({ module: 'Accounts' });
    expect(parsed.limit).toBe(100);
  });

  it('ListPrintFormatsInput default limit set', () => {
    const parsed = ErpNextTools.ListPrintFormatsInput.parse({});
    expect(parsed.limit).toBe(100);
  });

  it('ListRolesInput default excludes disabled', () => {
    const parsed = ErpNextTools.ListRolesInput.parse({});
    expect(parsed.includeDisabled).toBe(false);
  });

  it('CountDocsInput validates doctype', () => {
    const parsed = ErpNextTools.CountDocsInput.parse({ doctype: 'Sales Invoice' });
    expect(parsed.doctype).toBe('Sales Invoice');
  });

  it('ListLinkFieldsInput requires doctype', () => {
    const parsed = ErpNextTools.ListLinkFieldsInput.parse({ doctype: 'Sales Invoice' });
    expect(parsed.doctype).toBe('Sales Invoice');
  });

  it('ListChildTablesInput requires doctype', () => {
    const parsed = ErpNextTools.ListChildTablesInput.parse({ doctype: 'Sales Invoice' });
    expect(parsed.doctype).toBe('Sales Invoice');
  });

  it('GetDocTypePermissionsInput requires doctype', () => {
    const parsed = ErpNextTools.GetDocTypePermissionsInput.parse({ doctype: 'Sales Invoice' });
    expect(parsed.doctype).toBe('Sales Invoice');
  });

  it('ListWorkflowsInput default limit set', () => {
    const parsed = ErpNextTools.ListWorkflowsInput.parse({});
    expect(parsed.limit).toBe(100);
  });

  it('GetWorkflowInput requires name', () => {
    expect(() => ErpNextTools.GetWorkflowInput.parse({} as any)).toThrow();
  });

  it('ListCommentsInput requires reference', () => {
    expect(() => ErpNextTools.ListCommentsInput.parse({} as any)).toThrow();
  });

  it('ListFilesInput requires attachment reference', () => {
    expect(() => ErpNextTools.ListFilesInput.parse({} as any)).toThrow();
  });

  it('ListVersionsInput requires reference', () => {
    expect(() => ErpNextTools.ListVersionsInput.parse({} as any)).toThrow();
  });

  // Users & Customizations & Modules
  it('ListUsersInput default activeOnly', () => {
    const parsed = ErpNextTools.ListUsersInput.parse({});
    expect(parsed.activeOnly).toBe(true);
  });

  it('GetUserInput requires name', () => {
    expect(() => ErpNextTools.GetUserInput.parse({} as any)).toThrow();
  });

  it('ListUserRolesInput requires user', () => {
    expect(() => ErpNextTools.ListUserRolesInput.parse({} as any)).toThrow();
  });

  it('ListCustomFieldsInput default limit', () => {
    const parsed = ErpNextTools.ListCustomFieldsInput.parse({});
    expect(parsed.limit).toBe(100);
  });

  it('ListPropertySettersInput default limit', () => {
    const parsed = ErpNextTools.ListPropertySettersInput.parse({});
    expect(parsed.limit).toBe(200);
  });

  it('ListModulesInput default limit', () => {
    const parsed = ErpNextTools.ListModulesInput.parse({});
    expect(parsed.limit).toBe(100);
  });

  it('ListDashboardChartsInput default limit', () => {
    const parsed = ErpNextTools.ListDashboardChartsInput.parse({});
    expect(parsed.limit).toBe(100);
  });

  it('GetDashboardChartInput requires name', () => {
    expect(() => ErpNextTools.GetDashboardChartInput.parse({} as any)).toThrow();
  });

  it('ListCommunicationsInput requires reference', () => {
    expect(() => ErpNextTools.ListCommunicationsInput.parse({} as any)).toThrow();
  });

  it('ListDocSharesInput requires share reference', () => {
    expect(() => ErpNextTools.ListDocSharesInput.parse({} as any)).toThrow();
  });

  it('ListToDosInput default limit', () => {
    const parsed = ErpNextTools.ListToDosInput.parse({});
    expect(parsed.limit).toBe(100);
  });

  it('ListTagLinksInput requires doc reference', () => {
    expect(() => ErpNextTools.ListTagLinksInput.parse({} as any)).toThrow();
  });

  // Companies / Currency / UOM / Countries defaults
  it('ListCompaniesInput default limit', () => {
    const parsed = ErpNextTools.ListCompaniesInput.parse({});
    expect(parsed.limit).toBe(100);
  });
  it('ListCurrenciesInput default limit', () => {
    const parsed = ErpNextTools.ListCurrenciesInput.parse({});
    expect(parsed.limit).toBe(100);
  });
  it('ListCurrencyExchangeInput default limit', () => {
    const parsed = ErpNextTools.ListCurrencyExchangeInput.parse({});
    expect(parsed.limit).toBe(200);
  });
  it('ListUOMsInput default limit', () => {
    const parsed = ErpNextTools.ListUOMsInput.parse({});
    expect(parsed.limit).toBe(100);
  });
  it('ListCountriesInput default limit', () => {
    const parsed = ErpNextTools.ListCountriesInput.parse({});
    expect(parsed.limit).toBe(100);
  });

  // Workspaces / Scripts / Notifications / Email / Schedules / Settings
  it('ListWorkspacesInput default limit', () => {
    const parsed = ErpNextTools.ListWorkspacesInput.parse({});
    expect(parsed.limit).toBe(100);
  });
  it('ListServerScriptsInput default limit', () => {
    const parsed = ErpNextTools.ListServerScriptsInput.parse({});
    expect(parsed.limit).toBe(100);
  });
  it('ListAutoEmailReportsInput default limit', () => {
    const parsed = ErpNextTools.ListAutoEmailReportsInput.parse({});
    expect(parsed.limit).toBe(100);
  });
  it('ListNotificationsInput default limit', () => {
    const parsed = ErpNextTools.ListNotificationsInput.parse({});
    expect(parsed.limit).toBe(100);
  });
  it('ListEmailAccountsInput default limit', () => {
    const parsed = ErpNextTools.ListEmailAccountsInput.parse({});
    expect(parsed.limit).toBe(100);
  });
  it('ListScheduledJobsInput default limit', () => {
    const parsed = ErpNextTools.ListScheduledJobsInput.parse({});
    expect(parsed.limit).toBe(100);
  });

  // Generic list/get
  it('ListDocumentsInput defaults fields and limit', () => {
    const parsed = ErpNextTools.ListDocumentsInput.parse({ doctype: 'Customer' });
    expect(parsed.fields).toEqual(['*']);
    expect(parsed.limit).toBe(100);
  });
  it('GetDocumentInput requires doctype and name', () => {
    expect(() => ErpNextTools.GetDocumentInput.parse({ doctype: 'Customer' } as any)).toThrow();
    const parsed = ErpNextTools.GetDocumentInput.parse({ doctype: 'Customer', name: 'CUST-0001' });
    expect(parsed.doctype).toBe('Customer');
    expect(parsed.name).toBe('CUST-0001');
  });
});
