/**
 * ERPNext Client Script: Reservation Copilot Button
 * Adds "Copilot" button to Reservation form that opens coagent interface
 */

frappe.ui.form.on('Reservation', {
  refresh(frm) {
    // Add Copilot button to toolbar
    frm.add_custom_button('🤖 Copilot', () => {
      openCoagentDialog(frm);
    });
  }
});

/**
 * Open coagent dialog with iframe to frontend
 */
function openCoagentDialog(frm) {
  // Build URL with document context
  const params = new URLSearchParams({
    doctype: encodeURIComponent(frm.doctype),
    name: encodeURIComponent(frm.doc.name),
  });

  const coagentUrl = `/coagent?${params.toString()}`;

  // Create dialog
  const dialog = new frappe.ui.Dialog({
    title: `${frm.doctype} Copilot`,
    size: 'extra-large',
    static: true,
  });

  // Add iframe with coagent interface
  dialog.$body.html(`
    <iframe
      src="${coagentUrl}"
      style="width:100%; height:70vh; border:0; border-radius:4px;"
      title="ERPNext Coagent"
    ></iframe>
  `);

  // Show dialog
  dialog.show();

  // Refresh form when dialog closes (in case agent made changes)
  dialog.$wrapper.on('hidden.bs.modal', () => {
    frm.reload_doc();
  });
}
