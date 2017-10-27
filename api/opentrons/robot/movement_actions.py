
from opentrons.state import selectors
from opentrons.robot.path_planning import plan_path, get_goal


def _slots_along_path(start, goal):
    pass


def slot_based_arc(state, moving_inst, start, goal):
    movements = []
    safe_height = max([selectors.max_height_in_slot(state, slot) # need to grow a shell around the gantry to protect against both isntruments
                  for slot in _slots_along_path(start, goal)])
    for instrument in selectors.all_instruments(state):
        if safe_height > selectors.object_height():
            movements.append({
                'instrument': instrument, 'position':{'z':safe_height}
            })

    movements.append({
        'instrument': moving_inst, 'position': {'x':goal['x'], 'y':goal['y']}
    })

    movements.append({
        'instrument': moving_inst, 'position': {'z':goal['z']}
    })

    return movements



def plan_path(state, instrument, start, goal):
    path = slot_based_arc(state, instrument, start, goal)

    if is_valid_path(path):
        return path

    else:
        raise RuntimeError('No Valid Path Found')



def transform_posit_coord_sys(position, target_coord_sys, starting_coord_sys='world'):
    pass

def _update_gantry_position(state, driver):
    '''updates position of '''
    driver_pos = driver.position
    gantry = selectors.gantry(state)
    l_inst = selectors.left_instrument(state)
    r_inst = selectors.right_instrument(state)

    state = state.set_obj_position(state, gantry, x=driver_pos['x'], y=driver_pos['y'])
    state = state.set_obj_position(state, l_inst, z=driver_pos['z'])
    state = state.set_obj_position(state, r_inst, z=driver_pos['a'])
    return state


def move_instrument_to(state, instrument, target_position):
    current_position = selectors.object_position(state, object=instrument)
    movement_plan = plan_path(state, instrument, start=current_position, goal=target_position) # where is 3 axes (for 1 pip) to 4 axes resolved?

    for movement in movement_plan:
        movement_goal = movement.target + get_relative_position(state, movement.instrument, gantry)
        driver_goal = transform_posit_coord_sys(state, movement_goal, target_coord_sys=gantry)

        driver_goal['z'] = selectors.instrument_axis(state, instrument)
        driver.move(driver_goal)

    state = _update_gantry_position(state, driver)




