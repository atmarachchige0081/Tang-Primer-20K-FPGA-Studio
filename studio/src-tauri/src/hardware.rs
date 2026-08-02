use crate::models::SerialDevice;

pub fn serial_devices() -> Result<Vec<SerialDevice>, String> {
    let mut devices = serialport::available_ports()
        .map_err(|error| format!("Cannot enumerate serial devices: {error}"))?
        .into_iter()
        .map(|port| {
            let (display_name, vendor_id, product_id, likely_board) = match port.port_type {
                serialport::SerialPortType::UsbPort(info) => {
                    let name = info.product.unwrap_or_else(|| "USB serial device".into());
                    let likely = (info.vid == 0x0403 && info.pid == 0x6010)
                        || name.to_ascii_lowercase().contains("jtag")
                        || name.to_ascii_lowercase().contains("tang");
                    (name, Some(info.vid), Some(info.pid), likely)
                }
                serialport::SerialPortType::BluetoothPort => {
                    ("Bluetooth serial device".into(), None, None, false)
                }
                serialport::SerialPortType::PciPort => {
                    ("PCI serial device".into(), None, None, false)
                }
                serialport::SerialPortType::Unknown => ("Serial device".into(), None, None, false),
            };
            SerialDevice {
                port_name: port.port_name,
                display_name,
                vendor_id,
                product_id,
                likely_board,
            }
        })
        .collect::<Vec<_>>();
    devices.sort_by(|left, right| left.port_name.cmp(&right.port_name));
    Ok(devices)
}
