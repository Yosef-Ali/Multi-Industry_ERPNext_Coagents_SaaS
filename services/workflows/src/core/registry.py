"""
Workflow Graph Registry

Maps workflow graph names to Python module implementations.
Provides dynamic loading of LangGraph StateGraph instances.

Implementation of T169: Workflow graph registry
Enhanced by T081: Industry filtering + capability metadata + validation hooks
"""

import importlib
from typing import Any, Callable, Dict, List, Optional, Set
from dataclasses import dataclass, field
from langgraph.graph import StateGraph


@dataclass
class WorkflowCapabilities:
    """Capabilities exposed by a workflow graph"""
    supports_interrupts: bool = True  # Can pause for approval
    supports_parallel: bool = False  # Can execute parallel branches
    requires_approval: bool = True  # Requires human approval gates
    supports_rollback: bool = False  # Can rollback to previous state
    custom_capabilities: List[str] = field(default_factory=list)  # Industry-specific


@dataclass
class WorkflowGraphMetadata:
    """Metadata for a registered workflow graph"""
    name: str
    module_path: str
    description: str
    industry: str
    initial_state_schema: Dict[str, Any]
    estimated_steps: int
    capabilities: WorkflowCapabilities = field(default_factory=WorkflowCapabilities)
    tags: Set[str] = field(default_factory=set)  # e.g., {"financial", "clinical", "production"}


class WorkflowRegistry:
    """
    Central registry for all LangGraph workflow implementations

    Allows dynamic loading and execution of workflow graphs by name
    """

    # Static registry of all workflows
    WORKFLOWS: Dict[str, WorkflowGraphMetadata] = {
        # Hotel workflows
        "hotel_o2c": WorkflowGraphMetadata(
            name="hotel_o2c",
            module_path="hotel.o2c_graph",
            description="Hotel Order-to-Cash: Check-in → Folio → Check-out → Invoice",
            industry="hotel",
            initial_state_schema={
                "reservation_id": "str",
                "guest_name": "str",
                "room_number": "str",
                "check_in_date": "str",
                "check_out_date": "str"
            },
            estimated_steps=5,
            capabilities=WorkflowCapabilities(
                supports_interrupts=True,
                requires_approval=True,
                supports_rollback=False,
                custom_capabilities=["folio_management", "charge_tracking"]
            ),
            tags={"financial", "hospitality", "order-to-cash"}
        ),
        # Hospital workflows
        "hospital_admissions": WorkflowGraphMetadata(
            name="hospital_admissions",
            module_path="hospital.admissions_graph",
            description="Patient admission: Record → Orders → Encounter → Billing",
            industry="hospital",
            initial_state_schema={
                "patient_name": "str",
                "admission_date": "str",
                "primary_diagnosis": "str",
                "clinical_protocol": "str (optional)"
            },
            estimated_steps=6,
            capabilities=WorkflowCapabilities(
                supports_interrupts=True,
                requires_approval=True,
                supports_rollback=False,
                custom_capabilities=["clinical_orders", "protocol_application", "encounter_billing"]
            ),
            tags={"clinical", "healthcare", "billing"}
        ),
        # Manufacturing workflows
        "manufacturing_production": WorkflowGraphMetadata(
            name="manufacturing_production",
            module_path="manufacturing.production_graph",
            description="Manufacturing Production: Material check → Work order → Material request → Stock entry → Quality inspection",
            industry="manufacturing",
            initial_state_schema={
                "item_code": "str",
                "item_name": "str",
                "qty_to_produce": "float",
                "production_date": "str",
                "warehouse": "str"
            },
            estimated_steps=5,
            capabilities=WorkflowCapabilities(
                supports_interrupts=True,
                requires_approval=True,
                supports_rollback=False,
                custom_capabilities=["bom_explosion", "material_request", "quality_inspection"]
            ),
            tags={"production", "inventory", "quality"}
        ),

        # Retail workflows
        "retail_fulfillment": WorkflowGraphMetadata(
            name="retail_fulfillment",
            module_path="retail.fulfillment_graph",
            description="Retail Order Fulfillment: Inventory check → Sales order → Pick list → Delivery → Payment",
            industry="retail",
            initial_state_schema={
                "customer_name": "str",
                "customer_id": "str",
                "order_items": "list[dict]",
                "delivery_date": "str",
                "warehouse": "str"
            },
            estimated_steps=5,
            capabilities=WorkflowCapabilities(
                supports_interrupts=True,
                requires_approval=True,
                supports_rollback=False,
                custom_capabilities=["inventory_validation", "pick_list_generation", "delivery_tracking"]
            ),
            tags={"retail", "fulfillment", "inventory"}
        ),

        # Education workflows
        "education_admissions": WorkflowGraphMetadata(
            name="education_admissions",
            module_path="education.admissions_graph",
            description="Education Admissions: Application review → Interview scheduling → Assessment → Admission decision → Enrollment",
            industry="education",
            initial_state_schema={
                "applicant_name": "str",
                "applicant_email": "str",
                "program_name": "str",
                "application_date": "str",
                "academic_score": "float"
            },
            estimated_steps=5,
            capabilities=WorkflowCapabilities(
                supports_interrupts=True,
                requires_approval=True,
                supports_rollback=False,
                custom_capabilities=["interview_scheduling", "assessment_tracking", "enrollment_automation"]
            ),
            tags={"education", "admissions", "academic"}
        )
    }

    def __init__(self):
        self._loaded_graphs: Dict[str, StateGraph] = {}

    def get_workflow_metadata(self, graph_name: str) -> Optional[WorkflowGraphMetadata]:
        """Get metadata for a workflow graph"""
        return self.WORKFLOWS.get(graph_name)

    def list_workflows(
        self,
        industry: Optional[str] = None,
        tags: Optional[Set[str]] = None,
        capability_filter: Optional[Callable[[WorkflowCapabilities], bool]] = None
    ) -> Dict[str, WorkflowGraphMetadata]:
        """
        List all registered workflows with optional filtering

        Args:
            industry: Filter by industry (e.g., "hotel", "hospital")
            tags: Filter workflows that have ANY of these tags
            capability_filter: Custom filter function on capabilities

        Returns:
            Dictionary of workflow metadata matching filters
        """
        workflows = self.WORKFLOWS.copy()

        # Filter by industry
        if industry:
            workflows = {
                name: metadata
                for name, metadata in workflows.items()
                if metadata.industry == industry
            }

        # Filter by tags (match ANY tag)
        if tags:
            workflows = {
                name: metadata
                for name, metadata in workflows.items()
                if metadata.tags & tags  # Set intersection
            }

        # Filter by custom capability predicate
        if capability_filter:
            workflows = {
                name: metadata
                for name, metadata in workflows.items()
                if capability_filter(metadata.capabilities)
            }

        return workflows

    def get_industries(self) -> List[str]:
        """Get all unique industries represented in registry"""
        return sorted(set(meta.industry for meta in self.WORKFLOWS.values()))

    def get_all_tags(self) -> Set[str]:
        """Get all unique tags across all workflows"""
        all_tags: Set[str] = set()
        for meta in self.WORKFLOWS.values():
            all_tags.update(meta.tags)
        return all_tags

    def find_workflows_with_capability(self, capability_name: str) -> List[str]:
        """
        Find workflows that support a specific custom capability

        Args:
            capability_name: Name of custom capability (e.g., "folio_management")

        Returns:
            List of workflow names that support this capability
        """
        return [
            name
            for name, meta in self.WORKFLOWS.items()
            if capability_name in meta.capabilities.custom_capabilities
        ]

    def load_graph(self, graph_name: str) -> StateGraph:
        """
        Load a workflow graph by name

        Args:
            graph_name: Name of the workflow graph

        Returns:
            StateGraph instance ready for execution

        Raises:
            ValueError: If graph name is not registered
            ImportError: If graph module cannot be loaded
        """
        # Check cache first
        if graph_name in self._loaded_graphs:
            return self._loaded_graphs[graph_name]

        # Get metadata
        metadata = self.get_workflow_metadata(graph_name)
        if not metadata:
            available = ", ".join(self.WORKFLOWS.keys())
            raise ValueError(
                f"Unknown workflow graph: {graph_name}. "
                f"Available graphs: {available}"
            )

        # Dynamically import module
        try:
            module = importlib.import_module(metadata.module_path)
        except ImportError as e:
            raise ImportError(
                f"Failed to load workflow module {metadata.module_path}: {e}"
            )

        # Get create_graph function from module
        if not hasattr(module, "create_graph"):
            raise ImportError(
                f"Workflow module {metadata.module_path} must export a "
                f"create_graph() function that returns a StateGraph"
            )

        create_graph_fn: Callable[[], Any] = module.create_graph
        graph = create_graph_fn()

        # Some graphs already return compiled instances. If not, compile now.
        if not hasattr(graph, "ainvoke"):
            graph = graph.compile()

        # Cache for future use
        self._loaded_graphs[graph_name] = graph

        return graph

    def validate_initial_state(
        self,
        graph_name: str,
        initial_state: Dict[str, Any]
    ) -> tuple[bool, Optional[str]]:
        """
        Validate initial state against graph's expected schema

        Enhanced by T081: Additional type validation and shared state checks

        Returns:
            (is_valid, error_message)
        """
        metadata = self.get_workflow_metadata(graph_name)
        if not metadata:
            return False, f"Unknown workflow: {graph_name}"

        # Check required fields
        schema = metadata.initial_state_schema
        required_fields = [
            field for field, type_str in schema.items()
            if "(optional)" not in type_str
        ]

        missing_fields = [
            field for field in required_fields
            if field not in initial_state
        ]

        if missing_fields:
            return False, f"Missing required fields: {', '.join(missing_fields)}"

        # Type validation hints (basic validation)
        for field, type_str in schema.items():
            if field not in initial_state:
                continue

            value = initial_state[field]
            base_type = type_str.split("(")[0].strip()  # Remove "(optional)" suffix

            # Basic type checks
            if base_type == "str" and not isinstance(value, str):
                return False, f"Field '{field}' must be a string, got {type(value).__name__}"
            elif base_type == "float" and not isinstance(value, (int, float)):
                return False, f"Field '{field}' must be numeric, got {type(value).__name__}"
            elif base_type.startswith("list") and not isinstance(value, list):
                return False, f"Field '{field}' must be a list, got {type(value).__name__}"

        # Ensure base shared state fields are present (from T080)
        # All workflows should have these via create_base_state() or manual inclusion
        base_fields = {"messages", "session_id", "step_count", "current_node", "error"}
        missing_base = base_fields - set(initial_state.keys())

        if missing_base:
            # Auto-populate missing base fields with defaults
            for field in missing_base:
                if field == "messages":
                    initial_state[field] = []
                elif field == "step_count":
                    initial_state[field] = 0
                else:
                    initial_state[field] = None

        return True, None

    def get_workflow_stats(self) -> Dict[str, Any]:
        """
        Get registry statistics

        Enhanced by T081: Additional capability and tag statistics
        """
        total_workflows = len(self.WORKFLOWS)
        by_industry = {}
        by_capability = {}
        all_tags = set()

        for metadata in self.WORKFLOWS.values():
            # Count by industry
            industry = metadata.industry
            by_industry[industry] = by_industry.get(industry, 0) + 1

            # Count by capability
            for cap in metadata.capabilities.custom_capabilities:
                by_capability[cap] = by_capability.get(cap, 0) + 1

            # Collect all tags
            all_tags.update(metadata.tags)

        # Count workflows with specific standard capabilities
        interrupts_count = sum(
            1 for meta in self.WORKFLOWS.values()
            if meta.capabilities.supports_interrupts
        )
        approval_count = sum(
            1 for meta in self.WORKFLOWS.values()
            if meta.capabilities.requires_approval
        )
        parallel_count = sum(
            1 for meta in self.WORKFLOWS.values()
            if meta.capabilities.supports_parallel
        )

        return {
            "total_workflows": total_workflows,
            "by_industry": by_industry,
            "loaded_graphs": len(self._loaded_graphs),
            "available_industries": list(by_industry.keys()),
            "all_tags": sorted(list(all_tags)),
            "custom_capabilities": by_capability,
            "standard_capabilities": {
                "supports_interrupts": interrupts_count,
                "requires_approval": approval_count,
                "supports_parallel": parallel_count
            }
        }


# Global registry instance
_registry = WorkflowRegistry()


def get_registry() -> WorkflowRegistry:
    """Get global workflow registry instance"""
    return _registry


def load_workflow_graph(graph_name: str) -> StateGraph:
    """
    Load a workflow graph by name (convenience function)

    Args:
        graph_name: Name of the workflow graph

    Returns:
        Compiled StateGraph ready for execution
    """
    return _registry.load_graph(graph_name)


def list_workflows(
    industry: Optional[str] = None,
    tags: Optional[Set[str]] = None,
    capability_filter: Optional[Callable[[WorkflowCapabilities], bool]] = None
) -> Dict[str, WorkflowGraphMetadata]:
    """
    List available workflows (convenience function)

    Args:
        industry: Optional industry filter
        tags: Optional tag filter (match ANY)
        capability_filter: Optional custom capability predicate

    Returns:
        Dictionary of workflow metadata
    """
    return _registry.list_workflows(industry, tags, capability_filter)


def validate_workflow_state(
    graph_name: str,
    initial_state: Dict[str, Any]
) -> tuple[bool, Optional[str]]:
    """
    Validate initial state for a workflow (convenience function)

    Returns:
        (is_valid, error_message)
    """
    return _registry.validate_initial_state(graph_name, initial_state)


# Export registry functions
__all__ = [
    "WorkflowRegistry",
    "WorkflowGraphMetadata",
    "WorkflowCapabilities",
    "get_registry",
    "load_workflow_graph",
    "list_workflows",
    "validate_workflow_state"
]
