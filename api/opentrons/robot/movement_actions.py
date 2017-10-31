from opentrons.state import selectors
from opentrons.robot.path_planning import plan_path, Movement

def transform_posit_coord_sys(position, target_coord_sys, starting_coord_sys='world'):
    pass

def _update_gantry_position(state, driver):
    '''Updates gantry and instrument positions following a driver movement'''
    driver_pos = driver.position
    gantry = selectors.gantry(state)
    l_inst = selectors.left_instrument(state)
    r_inst = selectors.right_instrument(state)

    state = set_obj_position(state, gantry, x=driver_pos['x'], y=driver_pos['y'])
    state = set_obj_position(state, l_inst, z=driver_pos['z'])
    state = set_obj_position(state, r_inst, z=driver_pos['a'])
    return state


def move_instrument_to(state, instrument, target_position):
    '''Plans and executes movement of an instrument to a target position'''
    movement_plan = plan_path(state, instrument, goal=target_position)
    for movement in movement_plan:
        state = _move_instrument(state, instrument, movement)
    return state


def _move_instrument(state, movement):
    '''Moves a gantry-mounted instrument directly to a target position'''
    instrument, target = movement

    movement_goal = target + get_relative_position(state, instrument, gantry)
    driver_goal = transform_posit_coord_sys(state, movement_goal, target_coord_sys=gantry)
    driver_goal['z'] = selectors.instrument_axis(state, instrument)
    driver.move(driver_goal)
    return _update_gantry_position(state, driver)





