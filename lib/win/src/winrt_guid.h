#pragma once

#include <winrt/base.h>

#if _MSC_VER < 1920
namespace std
{
    template <> struct hash<winrt::guid>
    {
        std::size_t operator()(const winrt::guid& k) const;
    };
}
#endif
