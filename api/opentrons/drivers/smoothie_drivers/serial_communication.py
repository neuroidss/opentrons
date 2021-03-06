import serial
from serial.tools import list_ports
import contextlib
import logging

log = logging.getLogger(__name__)

RECOVERY_TIMEOUT = 10
DEFAULT_SERIAL_TIMEOUT = 5
DEFAULT_WRITE_TIMEOUT = 30


def get_ports_by_name(device_name):
    '''Returns all serial devices with a given name'''
    filtered_devices = filter(
        lambda device: device_name in device[1],
        list_ports.comports()
    )
    device_ports = [device[0] for device in filtered_devices]
    return device_ports


def get_port_by_VID(vid):
    '''Returns first serial device with a given VID'''
    for d in list_ports.comports():
        if d.vid == vid:
            return d[0]


@contextlib.contextmanager
def serial_with_temp_timeout(serial_connection, timeout):
    '''Implements a temporary timeout for a serial connection'''
    saved_timeout = serial_connection.timeout
    if timeout is not None:
        serial_connection.timeout = timeout
    yield serial_connection
    serial_connection.timeout = saved_timeout


def _parse_smoothie_response(response, command, ack):
    if ack in response:
        parsed_response = response.split(ack)[0]
        # smoothieware can enter a weird state, where it repeats back
        # the sent command at the beginning of its response
        # This checks for this echo, and strips the command from the response
        if isinstance(command, str):
            command = command.encode()
        if command in parsed_response:
            parsed_response = parsed_response.replace(command, b'')
        return parsed_response.strip()
    else:
        return None


def clear_buffer(serial_connection):
    serial_connection.reset_input_buffer()


def _write_to_device_and_return(cmd, ack, device_connection):
    '''Writes to a serial device.
    - Formats command
    - Wait for ack return
    - return parsed response'''
    device_connection.write(cmd.encode())

    response = device_connection.read_until(ack.encode())

    clean_response = _parse_smoothie_response(
        response, cmd.encode(), ack.encode())
    if clean_response:
        return clean_response.decode()
    return ''


def _connect(port_name, baudrate):
    ser = serial.Serial(
        port=port_name,
        baudrate=baudrate,
        timeout=DEFAULT_SERIAL_TIMEOUT
    )
    log.debug(ser)
    return ser


def _attempt_command_recovery(command, ack, serial_conn):
    '''Recovery after following a failed write_and_return() atempt'''
    with serial_with_temp_timeout(serial_conn, RECOVERY_TIMEOUT) as device:
        response = _write_to_device_and_return(command, ack, device)
    if response is None:
        log.debug("No valid response during _attempt_command_recovery")
        raise RuntimeError(
            "Recovery attempted - no valid smoothie response "
            "for command: {} in {} seconds".format(
                command.encode(), RECOVERY_TIMEOUT))
    return response


def write_and_return(
        command, ack, serial_connection, timeout=DEFAULT_WRITE_TIMEOUT):
    '''Write a command and return the response'''
    log.debug('Write -> {}'.format(command.encode()))
    clear_buffer(serial_connection)
    with serial_with_temp_timeout(
            serial_connection, timeout) as device_connection:
        response = _write_to_device_and_return(command, ack, device_connection)
    log.debug('Read <- {}'.format(response.encode()))
    return response


def connect(device_name=None, port=None, baudrate=115200):
    '''
    Creates a serial connection
    :param device_name: defaults to 'Smoothieboard'
    :param baudrate: integer frequency for serial communication
    :return: serial.Serial connection
    '''
    if not port:
        port = get_ports_by_name(device_name=device_name)[0]
    log.debug("Device name: {}, Port: {}".format(device_name, port))
    return _connect(port_name=port, baudrate=baudrate)
