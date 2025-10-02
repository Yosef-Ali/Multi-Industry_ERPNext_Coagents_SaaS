"""
Workflow Graph Registry

Maps workflow graph names to Python module implementations.
Provides dynamic loading of LangGraph StateGraph instances.

Implementation of T169: Workflow graph registry
"""

import importlib
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass
from langgraph.graph import StateGraph


@dataclass
class WorkflowGraphMetadata:
    """Metadata for a registered workflow graph"""
    name: str
    module_path: str
    description: str
    industry: str
    initial_state_schema: Dict[str, Any]
    estimated_steps: int


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
            module_path="workflows.hotel.o2c_graph",
            description="Hotel Order-to-Cash: Check-in → Folio → Check-out → Invoice",
            industry="hotel",
            initial_state_schema={
                "reservation_id": "str",
                "guest_name": "str",
                "room_number": "str",
                "check_in_date": "str",
                "check_out_date": "str"
            },
            estimated_steps=5
        ),
        # Hospital workflows
        "hospital_admissions": WorkflowGraphMetadata(
            name="hospital_admissions",
            module_path="workflows.hospital.admissions_graph",
            description="Patient admission: Record → Orders → Encounter → Billing",
            industry="hospital",
            initial_state_schema={
                "patient_name": "str",
                "admission_date": "str",
                "primary_diagnosis": "str",
                "clinical_protocol": "str (optional)"
            },
            estimated_steps=6
        ),
        # Manufacturing workflows
        "manufacturing_production": WorkflowGraphMetadata(
            name="manufacturing_production",
            module_path="workflows.manufacturing.production_graph",
            description="Manufacturing Production: Material check → Work order → Material request → Stock entry → Quality inspection",
            industry="manufacturing",
            initial_state_schema={
                "item_code": "str",
                "item_name": "str",
                "qty_to_produce": "float",
                "production_date": "str",
                "warehouse": "str"
            },
            estimated_steps=5
        ),

        # Retail workflows
        "retail_fulfillment": WorkflowGraphMetadata(
            name="retail_fulfillment",
            module_path="workflows.retail.fulfillment_graph",
            description="Retail Order Fulfillment: Inventory check → Sales order → Pick list → Delivery → Payment",
            industry="retail",
            initial_state_schema={
                "customer_name": "str",
                "customer_id": "str",
                "order_items": "list[dict]",
                "delivery_date": "str",
                "warehouse": "str"
            },
            estimated_steps=5
        ),

        # Education workflows
        "education_admissions": WorkflowGraphMetadata(
            name="education_admissions",
            module_path="workflows.education.admissions_graph",
            description="Education Admissions: Application review → Interview scheduling → Assessment → Admission decision → Enrollment",
            industry="education",
            initial_state_schema={
                "applicant_name": "str",
                "applicant_email": "str",
                "program_name": "str",
                "application_date": "str",
                "academic_score": "float"
            },
            estimated_steps=5
        )
    }

    def __init__(self):
        self._loaded_graphs: Dict[str, StateGraph] = {}

    def get_workflow_metadata(self, graph_name: str) -> Optional[WorkflowGraphMetadata]:
        """Get metadata for a workflow graph"""
        return self.WORKFLOWS.get(graph_name)

    def list_workflows(self, industry: Optional[str] = None) -> Dict[str, WorkflowGraphMetadata]:
        """List all registered workflows, optionally filtered by industry"""
        if industry:
            return {
                name: metadata
                for name, metadata in self.WORKFLOWS.items()
                if metadata.industry == industry
            }
        return self.WORKFLOWS.copy()

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

        create_graph_fn: Callable[[], StateGraph] = module.create_graph
        graph = create_graph_fn()

        # Compile graph
        compiled_graph = graph.compile()

        # Cache for future use
        self._loaded_graphs[graph_name] = compiled_graph

        return compiled_graph

    def validate_initial_state(
        self,
        graph_name: str,
        initial_state: Dict[str, Any]
    ) -> tuple[bool, Optional[str]]:
        """
        Validate initial state against graph's expected schema

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

        return True, None

    def get_workflow_stats(self) -> Dict[str, Any]:
        """Get registry statistics"""
        total_workflows = len(self.WORKFLOWS)
        by_industry = {}

        for metadata in self.WORKFLOWS.values():
            industry = metadata.industry
            by_industry[industry] = by_industry.get(industry, 0) + 1

        return {
            "total_workflows": total_workflows,
            "by_industry": by_industry,
            "loaded_graphs": len(self._loaded_graphs),
            "available_industries": list(by_industry.keys())
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


def list_workflows(industry: Optional[str] = None) -> Dict[str, WorkflowGraphMetadata]:
    """
    List available workflows (convenience function)

    Args:
        industry: Optional industry filter

    Returns:
        Dictionary of workflow metadata
    """
    return _registry.list_workflows(industry)


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
    "get_registry",
    "load_workflow_graph",
    "list_workflows",
    "validate_workflow_state"
]
