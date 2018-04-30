from ..trackers.pose_tracker import Point, change_base, update, ROOT


class Mover:
    def __init__(self, driver, axis_mapping, dst, src=ROOT):
        self._driver = driver
        self._axis_mapping = axis_mapping
        self._axis_maximum = {'x': None, 'y': None, 'z': None}
        self._dst = dst
        self._src = src
        self.needs_to_home = True

    def jog(self, pose_tree, axis, distance):
        assert axis in 'xyz', "axis value should be x, y or z"
        assert axis in self._axis_mapping, "mapping is not set for " + axis

        if self.needs_to_home:
            self.home(pose_tree)

        x, y, z = change_base(pose_tree, src=self)

        target = {
            'x': x if 'x' in self._axis_mapping else None,
            'y': y if 'y' in self._axis_mapping else None,
            'z': z if 'z' in self._axis_mapping else None,
        }

        target[axis] += distance

        return self.move(pose_tree, **target)

    def move(self, pose_tree, x=None, y=None, z=None):
        """
        Dispatch move command to the driver changing base of
        x, y and z from source coordinate system to destination.

        Value must be set for each axis that is mapped.
        """
        def defaults(_x, _y, _z):
            _x = _x if x is not None else 0
            _y = _y if y is not None else 0
            _z = _z if z is not None else 0
            return _x, _y, _z

        if self.needs_to_home:
            self.home(pose_tree)

        dst_x, dst_y, dst_z = change_base(
            pose_tree,
            src=self._src,
            dst=self._dst,
            point=Point(*defaults(x, y, z)))
        driver_target = {}

        if 'x' in self._axis_mapping:
            assert x is not None, "Value must be set for each axis mapped"
            driver_target[self._axis_mapping['x']] = dst_x

        if 'y' in self._axis_mapping:
            assert y is not None, "Value must be set for each axis mapped"
            driver_target[self._axis_mapping['y']] = dst_y

        if 'z' in self._axis_mapping:
            assert z is not None, "Value must be set for each axis mapped"
            driver_target[self._axis_mapping['z']] = dst_z
        self._driver.move(driver_target)

        # Update pose with the new value. Since stepper motors are open loop
        # there is no need to to query diver for position
        return update(pose_tree, self, Point(*defaults(dst_x, dst_y, dst_z)))

    def home(self, pose_tree):
        self._driver.home(axis=''.join(self._axis_mapping.values()))
        self.needs_to_home = False
        return self.update_pose_from_driver(pose_tree)

    def fast_home(self, pose_tree, safety_margin):
        self._driver.fast_home(
            axis=''.join(self._axis_mapping.values()),
            safety_margin=safety_margin
        )
        self.needs_to_home = False
        return self.update_pose_from_driver(pose_tree)

    def set_speed(self, value):
        self._driver.set_speed(value)

    def push_speed(self):
        self._driver.push_speed()

    def pop_speed(self):
        self._driver.pop_speed()

    def set_current(self, power):
        self._driver.set_current({
                axis.upper(): power
                for axis in self._axis_mapping.values()
            })

    def push_current(self):
        self._driver.push_current()

    def pop_current(self):
        self._driver.pop_current()

    def probe(self, pose_tree, axis, movement):
        assert axis in self._axis_mapping, "mapping is not set for " + axis

        if self.needs_to_home:
            self.home(pose_tree)

        if axis in self._axis_mapping:
            self._driver.probe_axis(self._axis_mapping[axis], movement)
            return self.update_pose_from_driver(pose_tree)

    def delay(self, seconds):
        self._driver.delay(seconds)

    def axis_maximum(self, pose_tree, axis):
        assert axis in 'xyz', "axis value should be x, y or z"
        assert axis in self._axis_mapping, "mapping is not set for " + axis

        # change_base is computationally expensive
        # so only run if max pos is not known
        if self._axis_maximum[axis] is None:
            d_axis_max = self._driver.homed_position[self._axis_mapping[axis]]
            d_point = {'x': 0, 'y': 0, 'z': 0}
            d_point[axis] = d_axis_max
            x, y, z = change_base(
                pose_tree,
                src=self._dst,
                dst=self._src,
                point=Point(**d_point))
            point = {'x': x, 'y': y, 'z': z}
            self._axis_maximum[axis] = point[axis]
        return self._axis_maximum[axis]

    def update_pose_from_driver(self, pose_tree):
        # map from driver axis names to xyz and expand position
        # into point object
        point = Point(
            x=self._driver.position.get(self._axis_mapping.get('x', ''), 0.0),
            y=self._driver.position.get(self._axis_mapping.get('y', ''), 0.0),
            z=self._driver.position.get(self._axis_mapping.get('z', ''), 0.0)
        )

        return update(pose_tree, self, point)
