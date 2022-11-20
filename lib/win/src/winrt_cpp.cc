#include "winrt_cpp.h"

#include <sstream>
#include <iomanip>

#include <winrt\Windows.Devices.Bluetooth.h>
#include <winrt/Windows.Foundation.Collections.h>

std::string ws2s(const wchar_t* wstr)
{
    return winrt::to_string(wstr);
}

std::string formatBluetoothAddress(unsigned long long BluetoothAddress)
{
    std::ostringstream ret;
    ret << std::hex << std::setfill('0') << std::setw(2) << ((BluetoothAddress >> (5 * 8)) & 0xff)
        << ":" << std::setw(2) << ((BluetoothAddress >> (4 * 8)) & 0xff) << ":" << std::setw(2)
        << ((BluetoothAddress >> (3 * 8)) & 0xff) << ":" << std::setw(2)
        << ((BluetoothAddress >> (2 * 8)) & 0xff) << ":" << std::setw(2)
        << ((BluetoothAddress >> (1 * 8)) & 0xff) << ":" << std::setw(2)
        << ((BluetoothAddress >> (0 * 8)) & 0xff);
    return ret.str();
}

std::string formatBluetoothUuid(unsigned long long BluetoothAddress)
{
    std::ostringstream ret;
    ret << std::hex << std::setfill('0') << std::setw(2) << ((BluetoothAddress >> (5 * 8)) & 0xff)
        << std::setw(2) << ((BluetoothAddress >> (4 * 8)) & 0xff) << std::setw(2)
        << ((BluetoothAddress >> (3 * 8)) & 0xff) << std::setw(2)
        << ((BluetoothAddress >> (2 * 8)) & 0xff) << std::setw(2)
        << ((BluetoothAddress >> (1 * 8)) & 0xff) << std::setw(2)
        << ((BluetoothAddress >> (0 * 8)) & 0xff);
    return ret.str();
}

std::string toStr(winrt::guid uuid)
{
    try
    {
        auto ref = winrt::Windows::Devices::Bluetooth::BluetoothUuidHelper::TryGetShortId(uuid);
        if (ref)
        {
            auto i = ref.Value();
            std::ostringstream ret;
            ret << std::hex << i;
            return ret.str();
        }
    }
    catch (...)
    {
    }

    // taken from winrt/base.h
    char buffer[38];
    // 00000000-0000-0000-0000-000000000000
    sprintf_s(buffer, "%08x-%04hx-%04hx-%02hhx%02hhx-%02hhx%02hhx%02hhx%02hhx%02hhx%02hhx",
              uuid.Data1, uuid.Data2, uuid.Data3, uuid.Data4[0], uuid.Data4[1], uuid.Data4[2],
              uuid.Data4[3], uuid.Data4[4], uuid.Data4[5], uuid.Data4[6], uuid.Data4[7]);
    return std::string(buffer);
}

#define SET_VAL(prop, val, str) \
    if ((prop & val) == val)    \
    {                           \
        arr.push_back(str);     \
    }

std::vector<std::string> toPropertyArray(GattCharacteristicProperties& properties)
{
    std::vector<std::string> arr;
    SET_VAL(properties, GattCharacteristicProperties::Broadcast, "broadcast")
    SET_VAL(properties, GattCharacteristicProperties::Read, "read")
    SET_VAL(properties, GattCharacteristicProperties::WriteWithoutResponse, "writeWithoutResponse")
    SET_VAL(properties, GattCharacteristicProperties::Write, "write")
    SET_VAL(properties, GattCharacteristicProperties::Notify, "notify")
    SET_VAL(properties, GattCharacteristicProperties::Indicate, "indicate")
    SET_VAL(properties, GattCharacteristicProperties::AuthenticatedSignedWrites,
            "authenticatedSignedWrites")
    SET_VAL(properties, GattCharacteristicProperties::ExtendedProperties, "extendedProperties")
    return arr;
}
