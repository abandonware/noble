#include "winrt_guid.h"

#if _MSC_VER < 1920
namespace std
{
    std::size_t hash<winrt::guid>::operator()(const winrt::guid& k) const
    {
        auto str = winrt::to_hstring(k).c_str();
        return std::hash<std::wstring>()(str);
    }
}
#endif
