#!/usr/bin/env python3
"""
Test script to validate workflow registry

Verifies that all 5 workflows can be loaded successfully
"""

import sys
import asyncio
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from core.registry import get_registry, load_workflow_graph


async def test_workflow_registry():
    """Test workflow registry loading"""
    print("\n" + "="*60)
    print("WORKFLOW REGISTRY TEST")
    print("="*60 + "\n")

    registry = get_registry()

    # Get stats
    stats = registry.get_workflow_stats()
    print(f"📊 Registry Statistics:")
    print(f"   Total workflows: {stats['total_workflows']}")
    print(f"   Loaded graphs: {stats['loaded_graphs']}")
    print(f"   Industries: {', '.join(stats['available_industries'])}")
    print(f"\n   By industry:")
    for industry, count in stats['by_industry'].items():
        print(f"   - {industry}: {count} workflow(s)")

    print(f"\n{'='*60}")
    print("TESTING WORKFLOW LOADING")
    print("="*60 + "\n")

    # List of implemented workflows
    implemented_workflows = [
        "hotel_o2c",
        "hospital_admissions",
        "manufacturing_production",
        "retail_fulfillment",
        "education_admissions"
    ]

    results = []

    for workflow_name in implemented_workflows:
        print(f"🔄 Loading: {workflow_name}")

        try:
            # Get metadata
            metadata = registry.get_workflow_metadata(workflow_name)
            if not metadata:
                print(f"   ❌ Metadata not found")
                results.append((workflow_name, False, "Metadata not found"))
                continue

            print(f"   📋 {metadata.description}")
            print(f"   🏭 Industry: {metadata.industry}")
            print(f"   📝 Module: {metadata.module_path}")

            # Load graph
            graph = load_workflow_graph(workflow_name)

            print(f"   ✅ Graph loaded successfully")
            print(f"   📊 Graph type: {type(graph).__name__}")

            results.append((workflow_name, True, "OK"))

        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            results.append((workflow_name, False, str(e)))

        print()

    # Summary
    print("="*60)
    print("SUMMARY")
    print("="*60 + "\n")

    success_count = sum(1 for _, success, _ in results if success)
    total_count = len(results)

    print(f"✅ Successful: {success_count}/{total_count}")
    print(f"❌ Failed: {total_count - success_count}/{total_count}")

    if success_count == total_count:
        print(f"\n🎉 All workflows loaded successfully!")
    else:
        print(f"\n⚠️  Some workflows failed to load:")
        for name, success, error in results:
            if not success:
                print(f"   - {name}: {error}")

    print("\n" + "="*60 + "\n")

    return success_count == total_count


async def test_workflow_validation():
    """Test workflow state validation"""
    print("="*60)
    print("TESTING STATE VALIDATION")
    print("="*60 + "\n")

    registry = get_registry()

    # Test valid state
    print("✅ Testing valid state (hotel_o2c):")
    valid_state = {
        "reservation_id": "RES-001",
        "guest_name": "John Doe",
        "room_number": "101",
        "check_in_date": "2025-10-01",
        "check_out_date": "2025-10-02"
    }

    is_valid, error = registry.validate_initial_state("hotel_o2c", valid_state)
    print(f"   Valid: {is_valid}")
    if error:
        print(f"   Error: {error}")

    # Test invalid state (missing field)
    print("\n❌ Testing invalid state (missing field):")
    invalid_state = {
        "reservation_id": "RES-001",
        "guest_name": "John Doe"
        # Missing required fields
    }

    is_valid, error = registry.validate_initial_state("hotel_o2c", invalid_state)
    print(f"   Valid: {is_valid}")
    if error:
        print(f"   Error: {error}")

    print("\n" + "="*60 + "\n")


async def main():
    """Run all tests"""
    # Test registry loading
    all_loaded = await test_workflow_registry()

    # Test state validation
    await test_workflow_validation()

    # Exit code
    sys.exit(0 if all_loaded else 1)


if __name__ == "__main__":
    asyncio.run(main())
