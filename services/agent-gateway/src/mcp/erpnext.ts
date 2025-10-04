import { z } from 'zod';
import { FrappeAPIClient } from '../api';

/**
 * ERPNext MCP Tools (safe subset)
 *
 * These are thin, typed wrappers over the existing FrappeAPIClient used in the
 * gateway. We expose read-only, low-risk capabilities first.
 */

export const IntrospectDocTypeInput = z.object({
  doctype: z.string().min(1),
});
export const IntrospectDocTypeOutput = z.object({
  doctype: z.string(),
  fields: z.array(
    z.object({
      fieldname: z.string(),
      label: z.string().optional(),
      fieldtype: z.string().optional(),
      reqd: z.boolean().optional(),
    })
  ),
});

export type IntrospectDocTypeInput = z.infer<typeof IntrospectDocTypeInput>;
export type IntrospectDocTypeOutput = z.infer<typeof IntrospectDocTypeOutput>;

export const SearchRecordsInput = z.object({
  doctype: z.string().min(1),
  query: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(20),
});
export const SearchRecordsOutput = z.object({
  results: z.array(z.unknown()),
});

export type SearchRecordsInput = z.infer<typeof SearchRecordsInput>;
export type SearchRecordsOutput = z.infer<typeof SearchRecordsOutput>;

export const RunReportInput = z.object({
  report_name: z.string().min(1),
  filters: z.record(z.any()).optional(),
});
export const RunReportOutput = z.object({
  report_name: z.string(),
  columns: z.array(z.unknown()),
  data: z.array(z.unknown()),
});

export type RunReportInput = z.infer<typeof RunReportInput>;
export type RunReportOutput = z.infer<typeof RunReportOutput>;

export class ErpNextTools {
  constructor(private client: FrappeAPIClient) {}

  async introspectDocType(input: IntrospectDocTypeInput): Promise<IntrospectDocTypeOutput> {
    const { doctype } = IntrospectDocTypeInput.parse(input);

    // Attempt to fetch DocType metadata via Frappe API conventions
    const meta = await this.client.get(`/api/resource/DocType/${encodeURIComponent(doctype)}`);
    const fields = Array.isArray(meta?.data?.fields) ? meta.data.fields : [];
    const normalized = fields.map((f: any) => ({
      fieldname: String(f.fieldname ?? ''),
      label: typeof f.label === 'string' ? f.label : undefined,
      fieldtype: typeof f.fieldtype === 'string' ? f.fieldtype : undefined,
      reqd: Boolean(f.reqd ?? false),
    }));

    return { doctype, fields: normalized };
  }

  async searchRecords(input: SearchRecordsInput): Promise<SearchRecordsOutput> {
    const { doctype, query, limit } = SearchRecordsInput.parse(input);
    // Uses Frappe's /resource/<doctype>?fields=...&filters=... if available,
    // otherwise falls back to a quick search endpoint if configured.
    const res = await this.client.get(
      `/api/resource/${encodeURIComponent(doctype)}?limit=${limit}&fields=${encodeURIComponent('["name"]')}&or_filters=${encodeURIComponent('[ ["name","like", "%'+query+'%" ] ]')}`
    );
    const results = Array.isArray(res?.data) ? res.data : [];
    return { results };
  }

  async runReport(input: RunReportInput): Promise<RunReportOutput> {
    const { report_name, filters } = RunReportInput.parse(input);
    const res = await this.client.runReport({ report_name, filters });
    return RunReportOutput.parse({
      report_name: res.report_name,
      columns: res.columns ?? [],
      data: res.data ?? [],
    });
  }

  // List DocTypes (optionally filter by module, include/exclude child tables)
  static ListDocTypesInput = z.object({
    module: z.string().optional(),
    includeChildTables: z.boolean().default(false),
    custom: z.boolean().optional(),
    limit: z.number().int().min(1).max(500).default(100),
  });
  static ListDocTypesOutput = z.object({
    doctypes: z.array(
      z.object({
        name: z.string(),
        module: z.string().optional(),
        istable: z.boolean().optional(),
        issingle: z.boolean().optional(),
        is_tree: z.boolean().optional(),
      })
    ),
  });
  async listDocTypes(input: z.infer<typeof ErpNextTools.ListDocTypesInput>) {
    const { module, includeChildTables, custom, limit } = ErpNextTools.ListDocTypesInput.parse(input);
    const filters: Record<string, any> = {};
    if (!includeChildTables) filters.istable = 0;
    if (module) filters.module = module;
    if (typeof custom === 'boolean') filters.custom = Number(custom);

    const res = await this.client.searchDoc({
      doctype: 'DocType',
      filters,
      fields: ['name', 'module', 'istable', 'issingle', 'is_tree'],
      limit,
    });
    const doctypes = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListDocTypesOutput.parse({ doctypes });
  }

  // List fields for a DocType, optionally filter by fieldtypes
  static ListFieldsInput = z.object({
    doctype: z.string().min(1),
    fieldtypes: z.array(z.string()).optional(),
  });
  static ListFieldsOutput = z.object({
    doctype: z.string(),
    fields: z.array(
      z.object({
        fieldname: z.string(),
        label: z.string().optional(),
        fieldtype: z.string().optional(),
        reqd: z.boolean().optional(),
      })
    ),
  });
  async listFields(input: z.infer<typeof ErpNextTools.ListFieldsInput>) {
    const { doctype, fieldtypes } = ErpNextTools.ListFieldsInput.parse(input);
    const meta = await this.introspectDocType({ doctype });
    const fields = fieldtypes && fieldtypes.length > 0
      ? meta.fields.filter((f) => (f.fieldtype ? fieldtypes.includes(f.fieldtype) : false))
      : meta.fields;
    return ErpNextTools.ListFieldsOutput.parse({ doctype, fields });
  }

  // List Reports (by module/ref_doctype/is_standard)
  static ListReportsInput = z.object({
    module: z.string().optional(),
    ref_doctype: z.string().optional(),
    is_standard: z.boolean().optional(),
    report_type: z.string().optional(),
    limit: z.number().int().min(1).max(500).default(100),
  });
  static ListReportsOutput = z.object({
    reports: z.array(
      z.object({
        name: z.string(),
        ref_doctype: z.string().optional(),
        report_type: z.string().optional(),
        is_standard: z.union([z.boolean(), z.string()]).optional(),
        disabled: z.union([z.boolean(), z.string()]).optional(),
        module: z.string().optional(),
      })
    ),
  });
  async listReports(input: z.infer<typeof ErpNextTools.ListReportsInput>) {
    const { module, ref_doctype, is_standard, report_type, limit } = ErpNextTools.ListReportsInput.parse(input);
    const filters: Record<string, any> = {};
    if (module) filters.module = module;
    if (ref_doctype) filters.ref_doctype = ref_doctype;
    if (typeof is_standard === 'boolean') filters.is_standard = Number(is_standard);
    if (report_type) filters.report_type = report_type;
    const res = await this.client.searchDoc({
      doctype: 'Report',
      filters,
      fields: ['name', 'ref_doctype', 'report_type', 'is_standard', 'disabled', 'module'],
      limit,
    });
    const reports = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListReportsOutput.parse({ reports });
  }

  // Single Report info
  static GetReportInfoInput = z.object({ report_name: z.string().min(1) });
  static GetReportInfoOutput = z.object({ report: z.unknown() });
  async getReportInfo(input: z.infer<typeof ErpNextTools.GetReportInfoInput>) {
    const { report_name } = ErpNextTools.GetReportInfoInput.parse(input);
    const res = await this.client.get(`/api/resource/Report/${encodeURIComponent(report_name)}`);
    return ErpNextTools.GetReportInfoOutput.parse({ report: res?.data });
  }

  // List Print Formats (optionally by DocType)
  static ListPrintFormatsInput = z.object({
    doctype: z.string().optional(),
    limit: z.number().int().min(1).max(500).default(100),
  });
  static ListPrintFormatsOutput = z.object({
    print_formats: z.array(
      z.object({
        name: z.string(),
        doc_type: z.string().optional(),
        disabled: z.union([z.boolean(), z.string()]).optional(),
      })
    ),
  });
  async listPrintFormats(input: z.infer<typeof ErpNextTools.ListPrintFormatsInput>) {
    const { doctype, limit } = ErpNextTools.ListPrintFormatsInput.parse(input);
    const filters: Record<string, any> = {};
    if (doctype) filters.doc_type = doctype;
    const res = await this.client.searchDoc({
      doctype: 'Print Format',
      filters,
      fields: ['name', 'doc_type', 'disabled'],
      limit,
    });
    const print_formats = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListPrintFormatsOutput.parse({ print_formats });
  }

  // List Roles
  static ListRolesInput = z.object({ includeDisabled: z.boolean().default(false), limit: z.number().int().min(1).max(500).default(100) });
  static ListRolesOutput = z.object({ roles: z.array(z.object({ name: z.string(), disabled: z.union([z.boolean(), z.string()]).optional() })) });
  async listRoles(input: z.infer<typeof ErpNextTools.ListRolesInput>) {
    const { includeDisabled, limit } = ErpNextTools.ListRolesInput.parse(input);
    const filters: Record<string, any> = {};
    if (!includeDisabled) filters.disabled = 0;
    const res = await this.client.searchDoc({
      doctype: 'Role',
      filters,
      fields: ['name', 'disabled'],
      limit,
    });
    const roles = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListRolesOutput.parse({ roles });
  }

  // Count docs quickly using frappe.client.get_count
  static CountDocsInput = z.object({ doctype: z.string().min(1), filters: z.record(z.any()).optional() });
  static CountDocsOutput = z.object({ doctype: z.string(), count: z.number().int().nonnegative() });
  async countDocs(input: z.infer<typeof ErpNextTools.CountDocsInput>) {
    const { doctype, filters } = ErpNextTools.CountDocsInput.parse(input);
    const count = await this.client.callMethod({ method: 'frappe.client.get_count', args: { doctype, filters: filters ?? {} } });
    return ErpNextTools.CountDocsOutput.parse({ doctype, count: Number(count ?? 0) });
  }

  // List Link fields for a DocType (optionally filter by target doctype)
  static ListLinkFieldsInput = z.object({
    doctype: z.string().min(1),
    target_doctype: z.string().optional(),
  });
  static ListLinkFieldsOutput = z.object({
    doctype: z.string(),
    links: z.array(
      z.object({
        fieldname: z.string(),
        label: z.string().optional(),
        options: z.string().optional(),
      })
    ),
  });
  async listLinkFields(input: z.infer<typeof ErpNextTools.ListLinkFieldsInput>) {
    const { doctype, target_doctype } = ErpNextTools.ListLinkFieldsInput.parse(input);
    const meta = await this.introspectDocType({ doctype });
    const links = (meta.fields as any[])
      .filter((f) => f.fieldtype === 'Link' && typeof f.options === 'string')
      .map((f) => ({ fieldname: f.fieldname, label: f.label, options: f.options as string }))
      .filter((l) => (target_doctype ? l.options === target_doctype : true));
    return ErpNextTools.ListLinkFieldsOutput.parse({ doctype, links });
  }

  // List Child Table fields for a DocType
  static ListChildTablesInput = z.object({ doctype: z.string().min(1) });
  static ListChildTablesOutput = z.object({
    doctype: z.string(),
    tables: z.array(
      z.object({ fieldname: z.string(), label: z.string().optional(), options: z.string() })
    ),
  });
  async listChildTables(input: z.infer<typeof ErpNextTools.ListChildTablesInput>) {
    const { doctype } = ErpNextTools.ListChildTablesInput.parse(input);
    const meta = await this.introspectDocType({ doctype });
    const tables = (meta.fields as any[])
      .filter((f) => f.fieldtype === 'Table' && typeof f.options === 'string')
      .map((f) => ({ fieldname: f.fieldname, label: f.label, options: f.options as string }));
    return ErpNextTools.ListChildTablesOutput.parse({ doctype, tables });
  }

  // Get DocType permissions (DocPerm entries)
  static GetDocTypePermissionsInput = z.object({ doctype: z.string().min(1) });
  static GetDocTypePermissionsOutput = z.object({
    doctype: z.string(),
    permissions: z.array(
      z.object({
        role: z.string(),
        read: z.union([z.boolean(), z.number()]).optional(),
        write: z.union([z.boolean(), z.number()]).optional(),
        create: z.union([z.boolean(), z.number()]).optional(),
        delete: z.union([z.boolean(), z.number()]).optional(),
        submit: z.union([z.boolean(), z.number()]).optional(),
        cancel: z.union([z.boolean(), z.number()]).optional(),
        amend: z.union([z.boolean(), z.number()]).optional(),
        export: z.union([z.boolean(), z.number()]).optional(),
        import: z.union([z.boolean(), z.number()]).optional(),
        print: z.union([z.boolean(), z.number()]).optional(),
        email: z.union([z.boolean(), z.number()]).optional(),
      })
    ),
  });
  async getDocTypePermissions(input: z.infer<typeof ErpNextTools.GetDocTypePermissionsInput>) {
    const { doctype } = ErpNextTools.GetDocTypePermissionsInput.parse(input);
    const res = await this.client.get(`/api/resource/DocType/${encodeURIComponent(doctype)}`);
    const perms = Array.isArray(res?.data?.permissions) ? res.data.permissions : res?.data?.data?.permissions;
    const permissions = Array.isArray(perms) ? perms : [];
    return ErpNextTools.GetDocTypePermissionsOutput.parse({ doctype, permissions });
  }

  // Workflows listing and info
  static ListWorkflowsInput = z.object({ document_type: z.string().optional(), limit: z.number().int().min(1).max(500).default(100) });
  static ListWorkflowsOutput = z.object({ workflows: z.array(z.object({ name: z.string(), document_type: z.string().optional(), is_active: z.union([z.boolean(), z.number()]).optional() })) });
  async listWorkflows(input: z.infer<typeof ErpNextTools.ListWorkflowsInput>) {
    const { document_type, limit } = ErpNextTools.ListWorkflowsInput.parse(input);
    const filters: Record<string, any> = {};
    if (document_type) filters.document_type = document_type;
    const res = await this.client.searchDoc({ doctype: 'Workflow', filters, fields: ['name', 'document_type', 'is_active'], limit });
    const workflows = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListWorkflowsOutput.parse({ workflows });
  }

  static GetWorkflowInput = z.object({ name: z.string().min(1) });
  static GetWorkflowOutput = z.object({ workflow: z.unknown() });
  async getWorkflow(input: z.infer<typeof ErpNextTools.GetWorkflowInput>) {
    const { name } = ErpNextTools.GetWorkflowInput.parse(input);
    const res = await this.client.get(`/api/resource/Workflow/${encodeURIComponent(name)}`);
    return ErpNextTools.GetWorkflowOutput.parse({ workflow: res?.data });
  }

  // Comments for a document
  static ListCommentsInput = z.object({ reference_doctype: z.string().min(1), reference_name: z.string().min(1), limit: z.number().int().min(1).max(500).default(100) });
  static ListCommentsOutput = z.object({ comments: z.array(z.object({ content: z.string().optional(), comment_type: z.string().optional(), owner: z.string().optional(), creation: z.string().optional() })) });
  async listComments(input: z.infer<typeof ErpNextTools.ListCommentsInput>) {
    const { reference_doctype, reference_name, limit } = ErpNextTools.ListCommentsInput.parse(input);
    const res = await this.client.searchDoc({ doctype: 'Comment', filters: { reference_doctype, reference_name }, fields: ['content', 'comment_type', 'owner', 'creation'], limit });
    const comments = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListCommentsOutput.parse({ comments });
  }

  // Files/attachments for a document
  static ListFilesInput = z.object({ attached_to_doctype: z.string().min(1), attached_to_name: z.string().min(1), limit: z.number().int().min(1).max(500).default(100) });
  static ListFilesOutput = z.object({ files: z.array(z.object({ file_name: z.string().optional(), file_url: z.string().optional(), attached_to_field: z.string().optional(), is_private: z.union([z.boolean(), z.number()]).optional() })) });
  async listFiles(input: z.infer<typeof ErpNextTools.ListFilesInput>) {
    const { attached_to_doctype, attached_to_name, limit } = ErpNextTools.ListFilesInput.parse(input);
    const res = await this.client.searchDoc({ doctype: 'File', filters: { attached_to_doctype, attached_to_name }, fields: ['file_name', 'file_url', 'attached_to_field', 'is_private'], limit });
    const files = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListFilesOutput.parse({ files });
  }

  // Versions (audit) for a document
  static ListVersionsInput = z.object({ reference_doctype: z.string().min(1), reference_name: z.string().min(1), limit: z.number().int().min(1).max(500).default(100) });
  static ListVersionsOutput = z.object({ versions: z.array(z.object({ name: z.string().optional(), owner: z.string().optional(), creation: z.string().optional(), data: z.unknown().optional() })) });
  async listVersions(input: z.infer<typeof ErpNextTools.ListVersionsInput>) {
    const { reference_doctype, reference_name, limit } = ErpNextTools.ListVersionsInput.parse(input);
    // Depending on ERPNext version, fields could be ref_doctype/docname or reference_doctype/reference_name
    const filtersA = { ref_doctype: reference_doctype, docname: reference_name } as Record<string, any>;
    const filtersB = { reference_doctype, reference_name } as Record<string, any>;
    let res = await this.client.searchDoc({ doctype: 'Version', filters: filtersA, fields: ['name', 'owner', 'creation', 'data'], limit });
    let versions = Array.isArray(res?.documents) ? res.documents : [];
    if (versions.length === 0) {
      res = await this.client.searchDoc({ doctype: 'Version', filters: filtersB, fields: ['name', 'owner', 'creation', 'data'], limit });
      versions = Array.isArray(res?.documents) ? res.documents : [];
    }
    return ErpNextTools.ListVersionsOutput.parse({ versions });
  }

  // ---- Users ----
  static ListUsersInput = z.object({
    activeOnly: z.boolean().default(true),
    search: z.string().optional(),
    limit: z.number().int().min(1).max(500).default(100),
  });
  static ListUsersOutput = z.object({ users: z.array(z.object({ name: z.string(), full_name: z.string().optional(), enabled: z.union([z.boolean(), z.number()]).optional() })) });
  async listUsers(input: z.infer<typeof ErpNextTools.ListUsersInput>) {
    const { activeOnly, search, limit } = ErpNextTools.ListUsersInput.parse(input);
    const filters: Record<string, any> = {};
    if (activeOnly) filters.enabled = 1;
    if (search) {
      // name like search
      // Fallback: use filters on name with like through or_filters
    }
    const res = await this.client.searchDoc({ doctype: 'User', filters, fields: ['name', 'full_name', 'enabled'], limit });
    const users = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListUsersOutput.parse({ users });
  }

  static GetUserInput = z.object({ name: z.string().min(1) });
  static GetUserOutput = z.object({ user: z.unknown() });
  async getUser(input: z.infer<typeof ErpNextTools.GetUserInput>) {
    const { name } = ErpNextTools.GetUserInput.parse(input);
    const res = await this.client.get(`/api/resource/User/${encodeURIComponent(name)}`);
    return ErpNextTools.GetUserOutput.parse({ user: res?.data });
  }

  static ListUserRolesInput = z.object({ user: z.string().min(1), limit: z.number().int().min(1).max(500).default(100) });
  static ListUserRolesOutput = z.object({ roles: z.array(z.object({ role: z.string() })) });
  async listUserRoles(input: z.infer<typeof ErpNextTools.ListUserRolesInput>) {
    const { user, limit } = ErpNextTools.ListUserRolesInput.parse(input);
    // 'Has Role' child table rows reference parent user
    const res = await this.client.searchDoc({ doctype: 'Has Role', filters: { parent: user, parenttype: 'User' }, fields: ['role'], limit });
    const roles = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListUserRolesOutput.parse({ roles });
  }

  // ---- Customizations ----
  static ListCustomFieldsInput = z.object({ doctype: z.string().optional(), limit: z.number().int().min(1).max(500).default(100) });
  static ListCustomFieldsOutput = z.object({
    custom_fields: z.array(z.object({ fieldname: z.string().optional(), label: z.string().optional(), fieldtype: z.string().optional(), reqd: z.union([z.boolean(), z.number()]).optional(), options: z.string().optional(), insert_after: z.string().optional(), dt: z.string().optional(), idx: z.number().optional() }))
  });
  async listCustomFields(input: z.infer<typeof ErpNextTools.ListCustomFieldsInput>) {
    const { doctype, limit } = ErpNextTools.ListCustomFieldsInput.parse(input);
    const filters: Record<string, any> = {};
    if (doctype) filters.dt = doctype;
    const res = await this.client.searchDoc({ doctype: 'Custom Field', filters, fields: ['fieldname', 'label', 'fieldtype', 'reqd', 'options', 'insert_after', 'dt', 'idx'], limit });
    const custom_fields = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListCustomFieldsOutput.parse({ custom_fields });
  }

  static ListPropertySettersInput = z.object({ doctype: z.string().optional(), field_name: z.string().optional(), limit: z.number().int().min(1).max(1000).default(200) });
  static ListPropertySettersOutput = z.object({ property_setters: z.array(z.object({ doc_type: z.string().optional(), field_name: z.string().optional(), property: z.string().optional(), property_type: z.string().optional(), value: z.string().optional() })) });
  async listPropertySetters(input: z.infer<typeof ErpNextTools.ListPropertySettersInput>) {
    const { doctype, field_name, limit } = ErpNextTools.ListPropertySettersInput.parse(input);
    const filters: Record<string, any> = {};
    if (doctype) filters.doc_type = doctype;
    if (field_name) filters.field_name = field_name;
    const res = await this.client.searchDoc({ doctype: 'Property Setter', filters, fields: ['doc_type', 'field_name', 'property', 'property_type', 'value'], limit });
    const property_setters = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListPropertySettersOutput.parse({ property_setters });
  }

  // ---- Modules / Apps ----
  static ListModulesInput = z.object({ app_name: z.string().optional(), limit: z.number().int().min(1).max(500).default(100) });
  static ListModulesOutput = z.object({ modules: z.array(z.object({ name: z.string(), app_name: z.string().optional(), disabled: z.union([z.boolean(), z.number()]).optional() })) });
  async listModules(input: z.infer<typeof ErpNextTools.ListModulesInput>) {
    const { app_name, limit } = ErpNextTools.ListModulesInput.parse(input);
    const filters: Record<string, any> = {};
    if (app_name) filters.app_name = app_name;
    const res = await this.client.searchDoc({ doctype: 'Module Def', filters, fields: ['name', 'app_name', 'disabled'], limit });
    const modules = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListModulesOutput.parse({ modules });
  }

  static GetInstalledAppsOutput = z.object({ apps: z.array(z.object({ app: z.string(), version: z.string().optional() })) });
  async getInstalledApps() {
    try {
      const versions = await this.client.callMethod({ method: 'frappe.utils.change_log.get_versions' });
      const apps = Object.entries(versions || {}).map(([app, info]: any) => ({ app, version: String(info?.version ?? '') }));
      return ErpNextTools.GetInstalledAppsOutput.parse({ apps });
    } catch (e) {
      return ErpNextTools.GetInstalledAppsOutput.parse({ apps: [] });
    }
  }

  // ---- Dashboards ----
  static ListDashboardChartsInput = z.object({ document_type: z.string().optional(), limit: z.number().int().min(1).max(500).default(100) });
  static ListDashboardChartsOutput = z.object({ charts: z.array(z.object({ name: z.string(), chart_type: z.string().optional(), document_type: z.string().optional(), is_standard: z.union([z.boolean(), z.number()]).optional() })) });
  async listDashboardCharts(input: z.infer<typeof ErpNextTools.ListDashboardChartsInput>) {
    const { document_type, limit } = ErpNextTools.ListDashboardChartsInput.parse(input);
    const filters: Record<string, any> = {};
    if (document_type) filters.document_type = document_type;
    const res = await this.client.searchDoc({ doctype: 'Dashboard Chart', filters, fields: ['name', 'chart_type', 'document_type', 'is_standard'], limit });
    const charts = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListDashboardChartsOutput.parse({ charts });
  }

  static GetDashboardChartInput = z.object({ name: z.string().min(1) });
  static GetDashboardChartOutput = z.object({ chart: z.unknown() });
  async getDashboardChart(input: z.infer<typeof ErpNextTools.GetDashboardChartInput>) {
    const { name } = ErpNextTools.GetDashboardChartInput.parse(input);
    const res = await this.client.get(`/api/resource/Dashboard Chart/${encodeURIComponent(name)}`);
    return ErpNextTools.GetDashboardChartOutput.parse({ chart: res?.data });
  }

  // ---- Communications / Sharing / Tasks ----
  static ListCommunicationsInput = z.object({ reference_doctype: z.string().min(1), reference_name: z.string().min(1), limit: z.number().int().min(1).max(500).default(100) });
  static ListCommunicationsOutput = z.object({ communications: z.array(z.object({ subject: z.string().optional(), sender: z.string().optional(), communication_type: z.string().optional(), content: z.string().optional(), creation: z.string().optional() })) });
  async listCommunications(input: z.infer<typeof ErpNextTools.ListCommunicationsInput>) {
    const { reference_doctype, reference_name, limit } = ErpNextTools.ListCommunicationsInput.parse(input);
    const res = await this.client.searchDoc({ doctype: 'Communication', filters: { reference_doctype, reference_name }, fields: ['subject', 'sender', 'communication_type', 'content', 'creation'], limit });
    const communications = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListCommunicationsOutput.parse({ communications });
  }

  static ListDocSharesInput = z.object({ share_doctype: z.string().min(1), share_name: z.string().min(1), limit: z.number().int().min(1).max(500).default(100) });
  static ListDocSharesOutput = z.object({ shares: z.array(z.object({ user: z.string().optional(), read: z.union([z.boolean(), z.number()]).optional(), write: z.union([z.boolean(), z.number()]).optional(), share: z.union([z.boolean(), z.number()]).optional(), submit: z.union([z.boolean(), z.number()]).optional(), everyone: z.union([z.boolean(), z.number()]).optional() })) });
  async listDocShares(input: z.infer<typeof ErpNextTools.ListDocSharesInput>) {
    const { share_doctype, share_name, limit } = ErpNextTools.ListDocSharesInput.parse(input);
    const res = await this.client.searchDoc({ doctype: 'DocShare', filters: { share_doctype, share_name }, fields: ['user', 'read', 'write', 'share', 'submit', 'everyone'], limit });
    const shares = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListDocSharesOutput.parse({ shares });
  }

  static ListToDosInput = z.object({ reference_type: z.string().optional(), reference_name: z.string().optional(), status: z.string().optional(), owner: z.string().optional(), limit: z.number().int().min(1).max(500).default(100) });
  static ListToDosOutput = z.object({ todos: z.array(z.object({ description: z.string().optional(), status: z.string().optional(), owner: z.string().optional(), assigned_by: z.string().optional(), creation: z.string().optional(), priority: z.string().optional() })) });
  async listToDos(input: z.infer<typeof ErpNextTools.ListToDosInput>) {
    const { reference_type, reference_name, status, owner, limit } = ErpNextTools.ListToDosInput.parse(input);
    const filters: Record<string, any> = {};
    if (reference_type) filters.reference_type = reference_type;
    if (reference_name) filters.reference_name = reference_name;
    if (status) filters.status = status;
    if (owner) filters.owner = owner;
    const res = await this.client.searchDoc({ doctype: 'ToDo', filters, fields: ['description', 'status', 'owner', 'assigned_by', 'creation', 'priority'], limit });
    const todos = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListToDosOutput.parse({ todos });
  }

  static ListTagLinksInput = z.object({ document_type: z.string().min(1), document_name: z.string().min(1), limit: z.number().int().min(1).max(500).default(100) });
  static ListTagLinksOutput = z.object({ tags: z.array(z.object({ tag: z.string().optional() })) });
  async listTagLinks(input: z.infer<typeof ErpNextTools.ListTagLinksInput>) {
    const { document_type, document_name, limit } = ErpNextTools.ListTagLinksInput.parse(input);
    const res = await this.client.searchDoc({ doctype: 'Tag Link', filters: { document_type, document_name }, fields: ['tag'], limit });
    const tags = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListTagLinksOutput.parse({ tags });
  }

  // ---- Companies / Currencies / UOM / Countries ----
  static ListCompaniesInput = z.object({ limit: z.number().int().min(1).max(500).default(100) });
  static ListCompaniesOutput = z.object({ companies: z.array(z.object({ name: z.string(), abbreviation: z.string().optional(), default_currency: z.string().optional() })) });
  async listCompanies(input: z.infer<typeof ErpNextTools.ListCompaniesInput>) {
    const { limit } = ErpNextTools.ListCompaniesInput.parse(input);
    const res = await this.client.searchDoc({ doctype: 'Company', filters: {}, fields: ['name', 'abbreviation', 'default_currency'], limit });
    const companies = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListCompaniesOutput.parse({ companies });
  }

  static ListCurrenciesInput = z.object({ limit: z.number().int().min(1).max(500).default(100) });
  static ListCurrenciesOutput = z.object({ currencies: z.array(z.object({ name: z.string(), symbol: z.string().optional(), fraction: z.string().optional() })) });
  async listCurrencies(input: z.infer<typeof ErpNextTools.ListCurrenciesInput>) {
    const { limit } = ErpNextTools.ListCurrenciesInput.parse(input);
    const res = await this.client.searchDoc({ doctype: 'Currency', filters: {}, fields: ['name', 'symbol', 'fraction'], limit });
    const currencies = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListCurrenciesOutput.parse({ currencies });
  }

  static ListCurrencyExchangeInput = z.object({ from_currency: z.string().optional(), to_currency: z.string().optional(), limit: z.number().int().min(1).max(1000).default(200) });
  static ListCurrencyExchangeOutput = z.object({ exchanges: z.array(z.object({ from_currency: z.string().optional(), to_currency: z.string().optional(), exchange_rate: z.number().optional(), date: z.string().optional() })) });
  async listCurrencyExchanges(input: z.infer<typeof ErpNextTools.ListCurrencyExchangeInput>) {
    const { from_currency, to_currency, limit } = ErpNextTools.ListCurrencyExchangeInput.parse(input);
    const filters: Record<string, any> = {};
    if (from_currency) filters.from_currency = from_currency;
    if (to_currency) filters.to_currency = to_currency;
    const res = await this.client.searchDoc({ doctype: 'Currency Exchange', filters, fields: ['from_currency', 'to_currency', 'exchange_rate', 'date'], limit });
    const exchanges = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListCurrencyExchangeOutput.parse({ exchanges });
  }

  static ListUOMsInput = z.object({ limit: z.number().int().min(1).max(500).default(100) });
  static ListUOMsOutput = z.object({ uoms: z.array(z.object({ name: z.string(), must_be_whole_number: z.union([z.boolean(), z.number()]).optional(), enabled: z.union([z.boolean(), z.number()]).optional() })) });
  async listUOMs(input: z.infer<typeof ErpNextTools.ListUOMsInput>) {
    const { limit } = ErpNextTools.ListUOMsInput.parse(input);
    const res = await this.client.searchDoc({ doctype: 'UOM', filters: {}, fields: ['name', 'must_be_whole_number', 'enabled'], limit });
    const uoms = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListUOMsOutput.parse({ uoms });
  }

  static ListCountriesInput = z.object({ limit: z.number().int().min(1).max(500).default(100) });
  static ListCountriesOutput = z.object({ countries: z.array(z.object({ name: z.string(), code: z.string().optional(), enabled: z.union([z.boolean(), z.number()]).optional() })) });
  async listCountries(input: z.infer<typeof ErpNextTools.ListCountriesInput>) {
    const { limit } = ErpNextTools.ListCountriesInput.parse(input);
    const res = await this.client.searchDoc({ doctype: 'Country', filters: {}, fields: ['name', 'code', 'enabled'], limit });
    const countries = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListCountriesOutput.parse({ countries });
  }

  // ---- Workspaces / Server Scripts / Notifications / Email / Schedules ----
  static ListWorkspacesInput = z.object({ publicOnly: z.boolean().default(false), limit: z.number().int().min(1).max(500).default(100) });
  static ListWorkspacesOutput = z.object({ workspaces: z.array(z.object({ name: z.string(), title: z.string().optional(), module: z.string().optional(), public: z.union([z.boolean(), z.number()]).optional(), disabled: z.union([z.boolean(), z.number()]).optional() })) });
  async listWorkspaces(input: z.infer<typeof ErpNextTools.ListWorkspacesInput>) {
    const { publicOnly, limit } = ErpNextTools.ListWorkspacesInput.parse(input);
    const filters: Record<string, any> = {};
    if (publicOnly) filters.public = 1;
    const res = await this.client.searchDoc({ doctype: 'Workspace', filters, fields: ['name', 'title', 'module', 'public', 'disabled'], limit });
    const workspaces = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListWorkspacesOutput.parse({ workspaces });
  }

  static GetWorkspaceInput = z.object({ name: z.string().min(1) });
  static GetWorkspaceOutput = z.object({ workspace: z.unknown() });
  async getWorkspace(input: z.infer<typeof ErpNextTools.GetWorkspaceInput>) {
    const { name } = ErpNextTools.GetWorkspaceInput.parse(input);
    const res = await this.client.get(`/api/resource/Workspace/${encodeURIComponent(name)}`);
    return ErpNextTools.GetWorkspaceOutput.parse({ workspace: res?.data });
  }

  static ListServerScriptsInput = z.object({ script_type: z.string().optional(), limit: z.number().int().min(1).max(500).default(100) });
  static ListServerScriptsOutput = z.object({ server_scripts: z.array(z.object({ name: z.string(), script_type: z.string().optional(), enabled: z.union([z.boolean(), z.number()]).optional() })) });
  async listServerScripts(input: z.infer<typeof ErpNextTools.ListServerScriptsInput>) {
    const { script_type, limit } = ErpNextTools.ListServerScriptsInput.parse(input);
    const filters: Record<string, any> = {};
    if (script_type) filters.script_type = script_type;
    const res = await this.client.searchDoc({ doctype: 'Server Script', filters, fields: ['name', 'script_type', 'enabled'], limit });
    const server_scripts = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListServerScriptsOutput.parse({ server_scripts });
  }

  static ListAutoEmailReportsInput = z.object({ ref_doctype: z.string().optional(), limit: z.number().int().min(1).max(500).default(100) });
  static ListAutoEmailReportsOutput = z.object({ auto_email_reports: z.array(z.object({ name: z.string(), ref_doctype: z.string().optional(), enabled: z.union([z.boolean(), z.number()]).optional(), report_name: z.string().optional() })) });
  async listAutoEmailReports(input: z.infer<typeof ErpNextTools.ListAutoEmailReportsInput>) {
    const { ref_doctype, limit } = ErpNextTools.ListAutoEmailReportsInput.parse(input);
    const filters: Record<string, any> = {};
    if (ref_doctype) filters.ref_doctype = ref_doctype;
    const res = await this.client.searchDoc({ doctype: 'Auto Email Report', filters, fields: ['name', 'ref_doctype', 'enabled', 'report_name'], limit });
    const auto_email_reports = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListAutoEmailReportsOutput.parse({ auto_email_reports });
  }

  static ListNotificationsInput = z.object({ document_type: z.string().optional(), enabled: z.boolean().optional(), limit: z.number().int().min(1).max(500).default(100) });
  static ListNotificationsOutput = z.object({ notifications: z.array(z.object({ name: z.string(), document_type: z.string().optional(), enabled: z.union([z.boolean(), z.number()]).optional(), event: z.string().optional() })) });
  async listNotifications(input: z.infer<typeof ErpNextTools.ListNotificationsInput>) {
    const { document_type, enabled, limit } = ErpNextTools.ListNotificationsInput.parse(input);
    const filters: Record<string, any> = {};
    if (document_type) filters.document_type = document_type;
    if (typeof enabled === 'boolean') filters.enabled = Number(enabled);
    const res = await this.client.searchDoc({ doctype: 'Notification', filters, fields: ['name', 'document_type', 'enabled', 'event'], limit });
    const notifications = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListNotificationsOutput.parse({ notifications });
  }

  static ListEmailAccountsInput = z.object({ limit: z.number().int().min(1).max(500).default(100) });
  static ListEmailAccountsOutput = z.object({ email_accounts: z.array(z.object({ name: z.string(), email_id: z.string().optional(), default_outgoing: z.union([z.boolean(), z.number()]).optional() })) });
  async listEmailAccounts(input: z.infer<typeof ErpNextTools.ListEmailAccountsInput>) {
    const { limit } = ErpNextTools.ListEmailAccountsInput.parse(input);
    const res = await this.client.searchDoc({ doctype: 'Email Account', filters: {}, fields: ['name', 'email_id', 'default_outgoing'], limit });
    const email_accounts = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListEmailAccountsOutput.parse({ email_accounts });
  }

  static ListScheduledJobsInput = z.object({ method: z.string().optional(), limit: z.number().int().min(1).max(500).default(100) });
  static ListScheduledJobsOutput = z.object({ jobs: z.array(z.object({ method: z.string().optional(), frequency: z.string().optional(), stopped: z.union([z.boolean(), z.number()]).optional() })) });
  async listScheduledJobs(input: z.infer<typeof ErpNextTools.ListScheduledJobsInput>) {
    const { method, limit } = ErpNextTools.ListScheduledJobsInput.parse(input);
    const filters: Record<string, any> = {};
    if (method) filters.method = method;
    const res = await this.client.searchDoc({ doctype: 'Scheduled Job Type', filters, fields: ['method', 'frequency', 'stopped'], limit });
    const jobs = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListScheduledJobsOutput.parse({ jobs });
  }

  // ---- System Settings ----
  static GetSystemSettingsOutput = z.object({ settings: z.unknown() });
  async getSystemSettings() {
    const res = await this.client.get('/api/resource/System Settings/System Settings');
    return ErpNextTools.GetSystemSettingsOutput.parse({ settings: res?.data });
  }

  // ---- Website / Scripts / Permissions / Logs ----
  static ListWebPagesInput = z.object({ publishedOnly: z.boolean().default(false), limit: z.number().int().min(1).max(500).default(100) });
  static ListWebPagesOutput = z.object({ pages: z.array(z.object({ name: z.string(), route: z.string().optional(), published: z.union([z.boolean(), z.number()]).optional() })) });
  async listWebPages(input: z.infer<typeof ErpNextTools.ListWebPagesInput>) {
    const { publishedOnly, limit } = ErpNextTools.ListWebPagesInput.parse(input);
    const filters: Record<string, any> = {};
    if (publishedOnly) filters.published = 1;
    const res = await this.client.searchDoc({ doctype: 'Web Page', filters, fields: ['name', 'route', 'published'], limit });
    const pages = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListWebPagesOutput.parse({ pages });
  }

  static GetWebPageInput = z.object({ name: z.string().min(1) });
  static GetWebPageOutput = z.object({ page: z.unknown() });
  async getWebPage(input: z.infer<typeof ErpNextTools.GetWebPageInput>) {
    const { name } = ErpNextTools.GetWebPageInput.parse(input);
    const res = await this.client.get(`/api/resource/Web Page/${encodeURIComponent(name)}`);
    return ErpNextTools.GetWebPageOutput.parse({ page: res?.data });
  }

  static ListWebsiteRoutesInput = z.object({ ref_doctype: z.string().optional(), limit: z.number().int().min(1).max(1000).default(200) });
  static ListWebsiteRoutesOutput = z.object({ routes: z.array(z.object({ name: z.string().optional(), route: z.string().optional(), ref_doctype: z.string().optional(), docname: z.string().optional() })) });
  async listWebsiteRoutes(input: z.infer<typeof ErpNextTools.ListWebsiteRoutesInput>) {
    const { ref_doctype, limit } = ErpNextTools.ListWebsiteRoutesInput.parse(input);
    const filters: Record<string, any> = {};
    if (ref_doctype) filters.ref_doctype = ref_doctype;
    const res = await this.client.searchDoc({ doctype: 'Website Route', filters, fields: ['name', 'route', 'ref_doctype', 'docname'], limit });
    const routes = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListWebsiteRoutesOutput.parse({ routes });
  }

  static ListCustomScriptsInput = z.object({ dt: z.string().optional(), script_type: z.string().optional(), limit: z.number().int().min(1).max(1000).default(200) });
  static ListCustomScriptsOutput = z.object({ custom_scripts: z.array(z.object({ name: z.string(), dt: z.string().optional(), script_type: z.string().optional(), disabled: z.union([z.boolean(), z.number()]).optional() })) });
  async listCustomScripts(input: z.infer<typeof ErpNextTools.ListCustomScriptsInput>) {
    const { dt, script_type, limit } = ErpNextTools.ListCustomScriptsInput.parse(input);
    const filters: Record<string, any> = {};
    if (dt) filters.dt = dt;
    if (script_type) filters.script_type = script_type;
    const res = await this.client.searchDoc({ doctype: 'Custom Script', filters, fields: ['name', 'dt', 'script_type', 'disabled'], limit });
    const custom_scripts = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListCustomScriptsOutput.parse({ custom_scripts });
  }

  static ListUserPermissionsInput = z.object({ user: z.string().optional(), allow: z.string().optional(), limit: z.number().int().min(1).max(1000).default(200) });
  static ListUserPermissionsOutput = z.object({ user_permissions: z.array(z.object({ user: z.string().optional(), allow: z.string().optional(), for_value: z.string().optional(), applicable_for: z.string().optional(), applies_to_all_doctypes: z.union([z.boolean(), z.number()]).optional() })) });
  async listUserPermissions(input: z.infer<typeof ErpNextTools.ListUserPermissionsInput>) {
    const { user, allow, limit } = ErpNextTools.ListUserPermissionsInput.parse(input);
    const filters: Record<string, any> = {};
    if (user) filters.user = user;
    if (allow) filters.allow = allow;
    const res = await this.client.searchDoc({ doctype: 'User Permission', filters, fields: ['user', 'allow', 'for_value', 'applicable_for', 'applies_to_all_doctypes'], limit });
    const user_permissions = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListUserPermissionsOutput.parse({ user_permissions });
  }

  static ListAssignmentRulesInput = z.object({ document_type: z.string().optional(), disabled: z.boolean().optional(), limit: z.number().int().min(1).max(1000).default(200) });
  static ListAssignmentRulesOutput = z.object({ rules: z.array(z.object({ name: z.string(), document_type: z.string().optional(), priority: z.number().optional(), disabled: z.union([z.boolean(), z.number()]).optional() })) });
  async listAssignmentRules(input: z.infer<typeof ErpNextTools.ListAssignmentRulesInput>) {
    const { document_type, disabled, limit } = ErpNextTools.ListAssignmentRulesInput.parse(input);
    const filters: Record<string, any> = {};
    if (document_type) filters.document_type = document_type;
    if (typeof disabled === 'boolean') filters.disabled = Number(disabled);
    const res = await this.client.searchDoc({ doctype: 'Assignment Rule', filters, fields: ['name', 'document_type', 'priority', 'disabled'], limit });
    const rules = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListAssignmentRulesOutput.parse({ rules });
  }

  static ListAutoRepeatInput = z.object({ reference_doctype: z.string().optional(), status: z.string().optional(), limit: z.number().int().min(1).max(1000).default(200) });
  static ListAutoRepeatOutput = z.object({ auto_repeats: z.array(z.object({ name: z.string(), reference_doctype: z.string().optional(), reference_document: z.string().optional(), start_date: z.string().optional(), status: z.string().optional() })) });
  async listAutoRepeat(input: z.infer<typeof ErpNextTools.ListAutoRepeatInput>) {
    const { reference_doctype, status, limit } = ErpNextTools.ListAutoRepeatInput.parse(input);
    const filters: Record<string, any> = {};
    if (reference_doctype) filters.reference_doctype = reference_doctype;
    if (status) filters.status = status;
    const res = await this.client.searchDoc({ doctype: 'Auto Repeat', filters, fields: ['name', 'reference_doctype', 'reference_document', 'start_date', 'status'], limit });
    const auto_repeats = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListAutoRepeatOutput.parse({ auto_repeats });
  }

  static ListErrorLogsInput = z.object({ seen: z.boolean().optional(), method: z.string().optional(), limit: z.number().int().min(1).max(1000).default(200) });
  static ListErrorLogsOutput = z.object({ logs: z.array(z.object({ name: z.string().optional(), method: z.string().optional(), error: z.string().optional(), seen: z.union([z.boolean(), z.number()]).optional(), creation: z.string().optional() })) });
  async listErrorLogs(input: z.infer<typeof ErpNextTools.ListErrorLogsInput>) {
    const { seen, method, limit } = ErpNextTools.ListErrorLogsInput.parse(input);
    const filters: Record<string, any> = {};
    if (typeof seen === 'boolean') filters.seen = Number(seen);
    if (method) filters.method = method;
    const res = await this.client.searchDoc({ doctype: 'Error Log', filters, fields: ['name', 'method', 'error', 'seen', 'creation'], limit });
    const logs = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListErrorLogsOutput.parse({ logs });
  }

  static ListActivityLogsInput = z.object({ reference_doctype: z.string().optional(), reference_name: z.string().optional(), status: z.string().optional(), limit: z.number().int().min(1).max(1000).default(200) });
  static ListActivityLogsOutput = z.object({ logs: z.array(z.object({ reference_doctype: z.string().optional(), reference_name: z.string().optional(), status: z.string().optional(), subject: z.string().optional(), owner: z.string().optional(), creation: z.string().optional() })) });
  async listActivityLogs(input: z.infer<typeof ErpNextTools.ListActivityLogsInput>) {
    const { reference_doctype, reference_name, status, limit } = ErpNextTools.ListActivityLogsInput.parse(input);
    const filters: Record<string, any> = {};
    if (reference_doctype) filters.reference_doctype = reference_doctype;
    if (reference_name) filters.reference_name = reference_name;
    if (status) filters.status = status;
    const res = await this.client.searchDoc({ doctype: 'Activity Log', filters, fields: ['reference_doctype', 'reference_name', 'status', 'subject', 'owner', 'creation'], limit });
    const logs = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListActivityLogsOutput.parse({ logs });
  }

  static ListEmailQueueInput = z.object({ status: z.string().optional(), limit: z.number().int().min(1).max(1000).default(200) });
  static ListEmailQueueOutput = z.object({ emails: z.array(z.object({ name: z.string().optional(), sender: z.string().optional(), status: z.string().optional(), creation: z.string().optional() })) });
  async listEmailQueue(input: z.infer<typeof ErpNextTools.ListEmailQueueInput>) {
    const { status, limit } = ErpNextTools.ListEmailQueueInput.parse(input);
    const filters: Record<string, any> = {};
    if (status) filters.status = status;
    const res = await this.client.searchDoc({ doctype: 'Email Queue', filters, fields: ['name', 'sender', 'status', 'creation'], limit });
    const emails = Array.isArray(res?.documents) ? res.documents : [];
    return ErpNextTools.ListEmailQueueOutput.parse({ emails });
  }

  // ---- Generic document listing and fetching ----
  static ListDocumentsInput = z.object({
    doctype: z.string().min(1),
    filters: z.record(z.any()).optional(),
    fields: z.array(z.string()).optional().default(['*']),
    limit: z.number().int().min(1).max(1000).default(100),
    order_by: z.string().optional(),
  });
  static ListDocumentsOutput = z.object({ documents: z.array(z.unknown()), total: z.number().int().nonnegative() });
  async listDocuments(input: z.infer<typeof ErpNextTools.ListDocumentsInput>) {
    const { doctype, filters, fields, limit, order_by } = ErpNextTools.ListDocumentsInput.parse(input);
    const res = await this.client.searchDoc({ doctype, filters: filters ?? {}, fields: fields ?? ['*'], limit, order_by });
    return ErpNextTools.ListDocumentsOutput.parse({ documents: res?.documents ?? [], total: Number(res?.total ?? 0) });
  }

  static GetDocumentInput = z.object({ doctype: z.string().min(1), name: z.string().min(1) });
  static GetDocumentOutput = z.object({ document: z.unknown() });
  async getDocument(input: z.infer<typeof ErpNextTools.GetDocumentInput>) {
    const { doctype, name } = ErpNextTools.GetDocumentInput.parse(input);
    const res = await this.client.getDoc({ doctype, name });
    return ErpNextTools.GetDocumentOutput.parse({ document: res?.document });
  }
}
