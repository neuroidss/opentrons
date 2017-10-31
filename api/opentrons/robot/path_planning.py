from opentrons.state import selectors
from collections import namedtuple

Movement = namedtuple('Movement', 'instrument destination')

def well_to_coordinates(state, well, offset=None):
    """Returns the coordinates of the well center with an optional Point offset"""
    target = selectors.position(state, well) + offset
    return target


def _build_movement_arc(state, inst, goal, safe_z):
    """Build arc motion based on a given safe travel height"""
    plan = []
    for inst in selectors.all_instruments(state):
        if safe_z > selectors.object_height(inst):
            plan.append(Movement(inst, {'z': safe_z}))
    plan.append(Movement(inst, {'x': goal['x'], 'y': goal['y']}))
    plan.append(Movement(inst, {'z': goal['z']}))
    return plan


def _standard_arc(state, instrument, target_position, arc_height=10):
    """Returns a list of coordinates to arrive to the destination coordinate"""
    travel_height = max_z_value(state, 'world') + arc_height
    return _build_movement_arc(state, instrument, target_position, travel_height)


def plan_path(state, instrument, goal):
    path = _standard_arc(state, instrument, goal)

    if is_valid_path(path):
        return path

    else:
        raise RuntimeError('No Valid Path Found')
