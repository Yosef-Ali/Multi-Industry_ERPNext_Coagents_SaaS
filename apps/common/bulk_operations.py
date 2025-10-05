"""
Bulk Operations API for ERPNext Coagents
Provides batch document operations for AI-assisted workflows

Phase 3.7 - T113: Server-side batch update capabilities
"""

import frappe
from frappe import _
from typing import List, Dict, Any, Optional, Tuple
import json


def _safe_doc_identifiers(doc_ref: Any) -> Tuple[str, str]:
    """Return safe doctype/name strings even when doc_ref is malformed."""
    if isinstance(doc_ref, dict):
        return doc_ref.get("doctype", "Unknown"), doc_ref.get("name", "Unknown")
    return "Unknown", "Unknown"


@frappe.whitelist()
def bulk_update(documents: str, update_fields: str) -> Dict[str, Any]:
    """
    Batch update multiple documents with specified field values.

    Security features:
    - Maximum 50 documents per batch (performance + safety)
    - Permission checks on each document
    - Atomic updates with rollback on failure
    - Audit logging of all changes

    Args:
        documents: JSON string array of {doctype, name} objects
        update_fields: JSON string object of field: value pairs

    Returns:
        {
            "success": True/False,
            "updated": int,
            "failed": int,
            "errors": [error messages],
            "results": [per-document results]
        }

    Example:
        documents = '[{"doctype": "Patient", "name": "PAT-001"},
                      {"doctype": "Patient", "name": "PAT-002"}]'
        update_fields = '{"status": "Active", "reviewed": 1}'

        result = bulk_update(documents, update_fields)
    """
    # Parse JSON inputs
    try:
        docs = json.loads(documents) if isinstance(documents, str) else documents
        fields = json.loads(update_fields) if isinstance(update_fields, str) else update_fields
    except json.JSONDecodeError as e:
        frappe.throw(_("Invalid JSON input: {0}").format(str(e)))

    # Validate inputs
    if not isinstance(docs, list):
        frappe.throw(_("documents must be an array"))

    if not isinstance(fields, dict):
        frappe.throw(_("update_fields must be an object"))

    if len(docs) == 0:
        return {
            "success": True,
            "updated": 0,
            "failed": 0,
            "errors": [],
            "results": []
        }

    # Enforce batch size limit
    MAX_BATCH_SIZE = 50
    if len(docs) > MAX_BATCH_SIZE:
        frappe.throw(_("Batch size exceeds maximum of {0} documents").format(MAX_BATCH_SIZE))

    # Validate document structure
    for doc in docs:
        if not isinstance(doc, dict):
            frappe.throw(_("Each document must be an object"))
        if "doctype" not in doc or "name" not in doc:
            frappe.throw(_("Each document must have 'doctype' and 'name' fields"))

    # Validate fields (no system fields)
    RESTRICTED_FIELDS = [
        "name", "owner", "creation", "modified", "modified_by",
        "docstatus", "idx", "doctype", "parent", "parenttype", "parentfield"
    ]

    for field_name in fields.keys():
        if field_name in RESTRICTED_FIELDS:
            frappe.throw(_("Cannot update restricted field: {0}").format(field_name))

    # Initialize results
    results = []
    updated_count = 0
    failed_count = 0
    errors = []

    # Start transaction for atomic updates
    try:
        for doc_ref in docs:
            doc_result = _update_single_document(
                doctype=doc_ref["doctype"],
                docname=doc_ref["name"],
                fields=fields
            )

            results.append(doc_result)

            if doc_result["success"]:
                updated_count += 1
            else:
                failed_count += 1
                if doc_result.get("error"):
                    errors.append(doc_result["error"])

        # Commit transaction if all updates succeeded
        if failed_count == 0:
            frappe.db.commit()
            success = True
        else:
            # Rollback if any updates failed
            frappe.db.rollback()
            rollback_message = _("Update rolled back due to failures in this batch")
            for doc_result in results:
                if doc_result.get("success"):
                    doc_result["success"] = False
                    doc_result["error"] = rollback_message

            updated_count = 0
            failed_count = len([result for result in results if not result.get("success")])
            errors = [
                result.get("error")
                for result in results
                if not result.get("success") and result.get("error")
            ]
            success = False
            frappe.log_error(
                title="Bulk Update Failed",
                message="Failed to update documents. Rolled back all changes.\n\nErrors:\n" + "\n".join(errors)
            )

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(
            title="Bulk Update Exception",
            message=f"Unexpected error during bulk update: {str(e)}"
        )
        return {
            "success": False,
            "updated": 0,
            "failed": len(docs),
            "errors": [str(e)],
            "results": results
        }

    return {
        "success": success,
        "updated": updated_count,
        "failed": failed_count,
        "errors": errors,
        "results": results
    }


def _update_single_document(doctype: str, docname: str, fields: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update a single document with permission checks and error handling.

    Args:
        doctype: DocType name
        docname: Document name
        fields: Dictionary of field: value pairs

    Returns:
        {
            "doctype": str,
            "name": str,
            "success": bool,
            "error": str (if failed)
        }
    """
    try:
        # Check if document exists
        if not frappe.db.exists(doctype, docname):
            return {
                "doctype": doctype,
                "name": docname,
                "success": False,
                "error": _("Document does not exist")
            }

        # Load document
        doc = frappe.get_doc(doctype, docname)

        # Check write permission
        if not doc.has_permission("write"):
            return {
                "doctype": doctype,
                "name": docname,
                "success": False,
                "error": _("No write permission")
            }

        # Update fields
        for field_name, field_value in fields.items():
            # Validate field exists in DocType
            if not hasattr(doc, field_name):
                return {
                    "doctype": doctype,
                    "name": docname,
                    "success": False,
                    "error": _("Field does not exist: {0}").format(field_name)
                }

            # Set field value
            doc.set(field_name, field_value)

        # Save document (triggers validations and workflows)
        doc.save()

        # Log audit trail
        _log_bulk_update(doctype, docname, fields)

        return {
            "doctype": doctype,
            "name": docname,
            "success": True
        }

    except frappe.ValidationError as e:
        return {
            "doctype": doctype,
            "name": docname,
            "success": False,
            "error": _("Validation error: {0}").format(str(e))
        }

    except Exception as e:
        return {
            "doctype": doctype,
            "name": docname,
            "success": False,
            "error": str(e)
        }


def _log_bulk_update(doctype: str, docname: str, fields: Dict[str, Any]) -> None:
    """
    Log bulk update to audit trail.

    Args:
        doctype: DocType name
        docname: Document name
        fields: Updated fields
    """
    try:
        frappe.log_error(
            title=f"Bulk Update: {doctype} {docname}",
            message=f"Updated fields: {json.dumps(fields, indent=2)}\nUser: {frappe.session.user}"
        )
    except Exception:
        # Don't fail the update if logging fails
        pass


@frappe.whitelist()
def bulk_submit(documents: str) -> Dict[str, Any]:
    """
    Batch submit multiple documents.

    Args:
        documents: JSON string array of {doctype, name} objects

    Returns:
        {
            "success": True/False,
            "submitted": int,
            "failed": int,
            "errors": [error messages],
            "results": [per-document results]
        }
    """
    # Parse JSON input
    try:
        docs = json.loads(documents) if isinstance(documents, str) else documents
    except json.JSONDecodeError as e:
        frappe.throw(_("Invalid JSON input: {0}").format(str(e)))

    # Validate input
    if not isinstance(docs, list):
        frappe.throw(_("documents must be an array"))

    if len(docs) == 0:
        return {
            "success": True,
            "submitted": 0,
            "failed": 0,
            "errors": [],
            "results": []
        }

    # Enforce batch size limit
    MAX_BATCH_SIZE = 50
    if len(docs) > MAX_BATCH_SIZE:
        frappe.throw(_("Batch size exceeds maximum of {0} documents").format(MAX_BATCH_SIZE))

    # Initialize results
    results = []
    submitted_count = 0
    failed_count = 0
    errors = []

    # Process each document
    for doc_ref in docs:
        try:
            if not isinstance(doc_ref, dict) or "doctype" not in doc_ref or "name" not in doc_ref:
                doctype, name = _safe_doc_identifiers(doc_ref)
                results.append({
                    "doctype": doctype,
                    "name": name,
                    "success": False,
                    "error": _("Invalid document reference")
                })
                failed_count += 1
                continue

            # Load document
            doc = frappe.get_doc(doc_ref["doctype"], doc_ref["name"])

            # Check submit permission
            if not doc.has_permission("submit"):
                results.append({
                    "doctype": doc_ref["doctype"],
                    "name": doc_ref["name"],
                    "success": False,
                    "error": _("No submit permission")
                })
                failed_count += 1
                continue

            # Check if already submitted
            if doc.docstatus == 1:
                results.append({
                    "doctype": doc_ref["doctype"],
                    "name": doc_ref["name"],
                    "success": False,
                    "error": _("Document already submitted")
                })
                failed_count += 1
                continue

            # Submit document
            doc.submit()

            results.append({
                "doctype": doc_ref["doctype"],
                "name": doc_ref["name"],
                "success": True
            })
            submitted_count += 1

        except Exception as e:
            doctype, name = _safe_doc_identifiers(doc_ref)
            results.append({
                "doctype": doctype,
                "name": name,
                "success": False,
                "error": str(e)
            })
            failed_count += 1
            errors.append(str(e))

    # Commit transaction
    frappe.db.commit()

    return {
        "success": failed_count == 0,
        "submitted": submitted_count,
        "failed": failed_count,
        "errors": errors,
        "results": results
    }


@frappe.whitelist()
def bulk_cancel(documents: str) -> Dict[str, Any]:
    """
    Batch cancel multiple documents.

    Args:
        documents: JSON string array of {doctype, name} objects

    Returns:
        {
            "success": True/False,
            "cancelled": int,
            "failed": int,
            "errors": [error messages],
            "results": [per-document results]
        }
    """
    # Parse JSON input
    try:
        docs = json.loads(documents) if isinstance(documents, str) else documents
    except json.JSONDecodeError as e:
        frappe.throw(_("Invalid JSON input: {0}").format(str(e)))

    # Validate input
    if not isinstance(docs, list):
        frappe.throw(_("documents must be an array"))

    if len(docs) == 0:
        return {
            "success": True,
            "cancelled": 0,
            "failed": 0,
            "errors": [],
            "results": []
        }

    # Enforce batch size limit
    MAX_BATCH_SIZE = 50
    if len(docs) > MAX_BATCH_SIZE:
        frappe.throw(_("Batch size exceeds maximum of {0} documents").format(MAX_BATCH_SIZE))

    # Initialize results
    results = []
    cancelled_count = 0
    failed_count = 0
    errors = []

    # Process each document
    for doc_ref in docs:
        try:
            if not isinstance(doc_ref, dict) or "doctype" not in doc_ref or "name" not in doc_ref:
                doctype, name = _safe_doc_identifiers(doc_ref)
                results.append({
                    "doctype": doctype,
                    "name": name,
                    "success": False,
                    "error": _("Invalid document reference")
                })
                failed_count += 1
                continue

            # Load document
            doc = frappe.get_doc(doc_ref["doctype"], doc_ref["name"])

            # Check cancel permission
            if not doc.has_permission("cancel"):
                results.append({
                    "doctype": doc_ref["doctype"],
                    "name": doc_ref["name"],
                    "success": False,
                    "error": _("No cancel permission")
                })
                failed_count += 1
                continue

            # Check if already cancelled
            if doc.docstatus == 2:
                results.append({
                    "doctype": doc_ref["doctype"],
                    "name": doc_ref["name"],
                    "success": False,
                    "error": _("Document already cancelled")
                })
                failed_count += 1
                continue

            # Check if not submitted
            if doc.docstatus != 1:
                results.append({
                    "doctype": doc_ref["doctype"],
                    "name": doc_ref["name"],
                    "success": False,
                    "error": _("Document not submitted")
                })
                failed_count += 1
                continue

            # Cancel document
            doc.cancel()

            results.append({
                "doctype": doc_ref["doctype"],
                "name": doc_ref["name"],
                "success": True
            })
            cancelled_count += 1

        except Exception as e:
            doctype, name = _safe_doc_identifiers(doc_ref)
            results.append({
                "doctype": doctype,
                "name": name,
                "success": False,
                "error": str(e)
            })
            failed_count += 1
            errors.append(str(e))

    # Commit transaction
    frappe.db.commit()

    return {
        "success": failed_count == 0,
        "cancelled": cancelled_count,
        "failed": failed_count,
        "errors": errors,
        "results": results
    }
