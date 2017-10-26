import pytest

from opentrons.robot.movement_actions import move_instrument_to_position
from opentrons.trackers.pose_tracker import PoseTracker
from opentrons.state.state_selectors import get_object_position


@pytest.mark.parametrize("instrument, target_position, state", [])
def test_move_instrument_to_position(instrument, target_position, state):
    move_instrument_to_position(instrument, target_position, state)
    assert get_object_position(instrument, state) == target_position


@pytest.mark.parametrize("instrument, invalid_target_position, state", [])
def test_move_instrument_to_invalid_position(instrument, target_position, state):
    move_instrument_to_position(instrument, target_position, state)
    assert get_object_position(instrument, state) == target_position





