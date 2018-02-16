import warnings
from opentrons.containers.placeable import Container
from opentrons.data_storage import labware_definitions as ldef
from opentrons.data_storage import serializers
from typing import List


# ======================== Private Functions ======================== #
def _calculate_offset(container: Container) -> dict:
    new_definition = serializers.labware_to_json(container)
    base_definition = ldef.load_json(new_definition['metadata']['name'])

    first_well = list(base_definition['wells'].keys())[0]
    base_well = base_definition['wells'][first_well]
    new_well = new_definition['wells'][first_well]

    x, y, z = [
        new_well[axis] - base_well[axis]
        for axis in 'xyz'
    ]
    return {'x': x, 'y': y, 'z': z}
# ====================== END Private Functions ====================== #


# ======================== Public Functions ======================== #

def save_new_container(container: Container, container_name: str) -> bool:
    warnings.warn(
        "`save_new_container` deprecated. Use `save_labware` instead.")
    return save_labware(container, container_name)


def save_labware(container: Container, container_name: str) -> bool:
    definition = serializers.container_to_json(container, container_name)
    return ldef.save_user_definition(definition)


def load_container(container_name: str) -> Container:
    definition = ldef.load_json(container_name)
    return serializers.json_to_labware(definition)


def overwrite_container(container: Container) -> bool:
    warnings.warn("`overwrite_container` is deprecated. Use `save_labware` and"
                  " `save_offset` instead.")
    offset = _calculate_offset(container)
    definition_return = save_labware(container, container.get_name())
    offset_return = save_offset(container.get_name(), offset)
    return definition_return and offset_return


def save_offset(labware_name: str, offset: dict) -> bool:
    return ldef.save_labware_offset(labware_name, offset)


def list_all_containers() -> List[str]:
    return ldef.list_all_labware()
# ======================== END Public Functions ======================== #
