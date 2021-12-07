#pragma once

#include <winrt/base.h>

#if 0
namespace std
{
    template <> struct hash<winrt::guid>
    {
        std::size_t operator()(const winrt::guid& k) const;
    };
}
#endif
