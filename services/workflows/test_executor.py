#!/usr/bin/env python3
"""
Test script for workflow executor (T082)

Validates execution, interrupt/resume, and AG-UI event emission
"""

import sys
import asyncio
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from core.executor import (
    WorkflowExecutor,
    execute_workflow,
    ExecutionConfig,
    WorkflowExecutionResult
)
from core.stream_adapter import WorkflowProgressEvent


async def test_basic_execution():
    """Test basic workflow execution"""
    print("\n" + "="*60)
    print("TEST 1: Basic Workflow Execution")
    print("="*60 + "\n")

    # Hotel O2C workflow
    graph_name = "hotel_o2c"
    initial_state = {
        "reservation_id": "RES-TEST-001",
        "guest_name": "Alice Wonderland",
        "room_number": "305",
        "check_in_date": "2025-10-05",
        "check_out_date": "2025-10-07"
    }

    print(f"🚀 Executing workflow: {graph_name}")
    print(f"📋 Initial state: {initial_state['guest_name']}, Room {initial_state['room_number']}")

    try:
        result = await execute_workflow(graph_name, initial_state)

        print(f"\n✅ Execution completed:")
        print(f"   Success: {result.success}")
        print(f"   Steps completed: {len(result.steps_completed)}")
        print(f"   Execution time: {result.execution_time_ms}ms")
        print(f"   Interrupted: {result.interrupted}")
        
        if result.error:
            print(f"   ❌ Error: {result.error}")
        
        print(f"\n📊 Metadata:")
        for key, value in result.metadata.items():
            print(f"   - {key}: {value}")

        return result.success

    except Exception as e:
        print(f"\n❌ Execution failed: {e}")
        return False


async def test_execution_with_streaming():
    """Test workflow execution with AG-UI event streaming"""
    print("\n" + "="*60)
    print("TEST 2: Execution with AG-UI Streaming")
    print("="*60 + "\n")

    graph_name = "hotel_o2c"
    initial_state = {
        "reservation_id": "RES-TEST-002",
        "guest_name": "Bob Builder",
        "room_number": "404",
        "check_in_date": "2025-10-08",
        "check_out_date": "2025-10-10"
    }

    # Track emitted events
    events_received = []

    def emit_callback(event: WorkflowProgressEvent):
        """Callback to capture emitted events"""
        events_received.append(event)
        print(f"📡 Event: {event.type} - {event.step or 'N/A'}")

    print(f"🚀 Executing workflow with streaming: {graph_name}")

    try:
        config = ExecutionConfig(
            emit_agui_events=True,
            correlation_id="test-correlation-123"
        )

        executor = WorkflowExecutor(graph_name, config)
        result = await executor.execute(initial_state, emit_fn=emit_callback)

        print(f"\n✅ Execution completed:")
        print(f"   Success: {result.success}")
        print(f"   Events emitted: {len(events_received)}")
        print(f"   Execution time: {result.execution_time_ms}ms")

        print(f"\n📨 Event breakdown:")
        event_counts = {}
        for event in events_received:
            event_counts[event.type] = event_counts.get(event.type, 0) + 1
        
        for event_type, count in event_counts.items():
            print(f"   - {event_type}: {count}")

        return result.success

    except Exception as e:
        print(f"\n❌ Execution with streaming failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_executor_instance():
    """Test using WorkflowExecutor instance directly"""
    print("\n" + "="*60)
    print("TEST 3: WorkflowExecutor Instance")
    print("="*60 + "\n")

    graph_name = "hospital_admissions"
    initial_state = {
        "patient_name": "Charlie Patient",
        "admission_date": "2025-10-05",
        "primary_diagnosis": "Acute Appendicitis",
        "clinical_protocol": "Emergency Surgery Protocol"
    }

    print(f"🚀 Creating executor for: {graph_name}")

    try:
        config = ExecutionConfig(
            recursion_limit=30,
            emit_agui_events=False  # No streaming for this test
        )

        executor = WorkflowExecutor(graph_name, config)
        
        # Get metadata
        metadata = executor.get_metadata()
        print(f"📋 Workflow metadata:")
        print(f"   Industry: {metadata.industry}")
        print(f"   Description: {metadata.description}")
        print(f"   Estimated steps: {metadata.estimated_steps}")

        # Execute
        print(f"\n🚀 Executing...")
        result = await executor.execute(initial_state)

        print(f"\n✅ Execution completed:")
        print(f"   Success: {result.success}")
        print(f"   Execution time: {result.execution_time_ms}ms")

        # Get execution history
        history = executor.get_execution_history()
        print(f"\n📜 Execution history: {len(history)} execution(s)")

        return result.success

    except Exception as e:
        print(f"\n❌ Executor test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_state_validation():
    """Test state validation in executor"""
    print("\n" + "="*60)
    print("TEST 4: State Validation")
    print("="*60 + "\n")

    graph_name = "hotel_o2c"
    
    # Invalid state (missing required fields)
    invalid_state = {
        "reservation_id": "RES-INVALID",
        "guest_name": "Invalid Guest"
        # Missing: room_number, check_in_date, check_out_date
    }

    print(f"🚀 Testing invalid state validation")
    print(f"❌ Missing required fields: room_number, check_in_date, check_out_date")

    try:
        result = await execute_workflow(graph_name, invalid_state)

        if not result.success:
            print(f"\n✅ Validation correctly rejected invalid state")
            print(f"   Error: {result.error}")
            return True
        else:
            print(f"\n❌ Validation failed to catch invalid state")
            return False

    except Exception as e:
        print(f"\n❌ Test error: {e}")
        return False


async def test_multiple_workflows():
    """Test executing multiple different workflows"""
    print("\n" + "="*60)
    print("TEST 5: Multiple Workflow Types")
    print("="*60 + "\n")

    workflows = [
        {
            "name": "hotel_o2c",
            "state": {
                "reservation_id": "RES-MULTI-1",
                "guest_name": "Multi Test 1",
                "room_number": "101",
                "check_in_date": "2025-10-10",
                "check_out_date": "2025-10-12"
            }
        },
        {
            "name": "retail_fulfillment",
            "state": {
                "customer_name": "Multi Test Customer",
                "customer_id": "CUST-001",
                "order_items": [
                    {
                        "item_name": "Widget",
                        "item_code": "ITEM-001",
                        "qty": 5,
                        "rate": 100.00
                    }
                ],
                "delivery_date": "2025-10-15",
                "warehouse": "WH-Main"
            }
        }
    ]

    results = []

    for workflow in workflows:
        print(f"\n🔄 Executing: {workflow['name']}")
        
        try:
            result = await execute_workflow(workflow['name'], workflow['state'])
            results.append((workflow['name'], result.success))
            
            status = "✅" if result.success else "❌"
            print(f"   {status} {workflow['name']}: {result.execution_time_ms}ms")

        except Exception as e:
            print(f"   ❌ {workflow['name']}: {e}")
            results.append((workflow['name'], False))

    print(f"\n📊 Summary:")
    success_count = sum(1 for _, success in results if success)
    print(f"   Successful: {success_count}/{len(results)}")

    return success_count == len(results)


async def main():
    """Run all executor tests"""
    print("\n" + "="*60)
    print("WORKFLOW EXECUTOR TESTS (T082)")
    print("="*60)

    tests = [
        ("Basic Execution", test_basic_execution),
        ("Streaming Execution", test_execution_with_streaming),
        ("Executor Instance", test_executor_instance),
        ("State Validation", test_state_validation),
        ("Multiple Workflows", test_multiple_workflows)
    ]

    results = []

    for test_name, test_fn in tests:
        try:
            result = await test_fn()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ Test '{test_name}' crashed: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))

    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60 + "\n")

    success_count = sum(1 for _, success in results if success)
    total_count = len(results)

    for test_name, success in results:
        status = "✅" if success else "❌"
        print(f"{status} {test_name}")

    print(f"\n📊 Total: {success_count}/{total_count} tests passed")

    if success_count == total_count:
        print("\n🎉 All executor tests passed!")
    else:
        print(f"\n⚠️  {total_count - success_count} test(s) failed")

    print("\n" + "="*60 + "\n")

    sys.exit(0 if success_count == total_count else 1)


if __name__ == "__main__":
    asyncio.run(main())
