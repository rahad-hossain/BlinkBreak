// BlinkTaskbar.dll - BlinkBreak taskbar appearance engine
//
// Applies BlinkBreak's taskbar styles (clear, blur, acrylic, solid colour)
// to the Windows 11 taskbar. The DLL is loaded into explorer.exe and uses the
// public XAML Diagnostics API to reach the taskbar's visual tree.
//
// Overview:
//   1. BlinkBreak loads this DLL and calls BB_Inject().
//   2. BB_Inject() installs a short-lived WH_CALLWNDPROC hook on the taskbar
//      thread, which causes Windows to load the DLL into explorer.exe.
//   3. Inside Explorer, Install() pins the module and calls
//      InitializeXamlDiagnosticsEx(), which creates the Site object below.
//   4. VisualTreeWatcher locates the taskbar background elements and applies
//      the current style to them.
//   5. BB_SetStyle() stores the style under HKCU\Software\BlinkBreak\Taskbar
//      and signals a named event so Explorer-side code re-applies it.

#include <windows.h>
#include <ocidl.h>
#include <xamlOM.h>
#include <string>
#include <vector>
#include <mutex>
#include <thread>
#include <atomic>

// windows.h defines a GetCurrentTime macro that conflicts with a C++/WinRT member.
#undef GetCurrentTime

#include <winrt/base.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.System.h>
#include <winrt/Windows.UI.h>
#include <winrt/Windows.UI.Xaml.h>
#include <winrt/Windows.UI.Xaml.Media.h>
#include <winrt/Windows.UI.Xaml.Shapes.h>
#include <winrt/Windows.UI.Xaml.Hosting.h>
#include <winrt/Windows.UI.Composition.h>
#include <winrt/Windows.Graphics.Effects.h>
#include <windows.graphics.effects.interop.h>
#include <d2d1_1.h>
#include <d2d1effects.h>

namespace wux = winrt::Windows::UI::Xaml;

// {6B8A3C52-7E41-4F0B-9D2A-B1C4E5F60718}
static constexpr CLSID CLSID_BlinkSite = { 0x6b8a3c52, 0x7e41, 0x4f0b, { 0x9d, 0x2a, 0xb1, 0xc4, 0xe5, 0xf6, 0x07, 0x18 } };

static constexpr wchar_t READY_EVENT[] = L"BlinkBreakTaskbarReady";
static constexpr wchar_t REFRESH_EVENT[] = L"BlinkBreakTaskbarRefresh";
static constexpr wchar_t REG_KEY[] = L"Software\\BlinkBreak\\Taskbar";

static HMODULE g_module = nullptr;
static bool g_verbose = true;

// Diagnostic log at %TEMP%\BlinkTaskbar.log, written by both BlinkBreak and Explorer.
static void Log(const wchar_t* fmt, ...)
{
    wchar_t path[MAX_PATH];
    if (!GetTempPathW(MAX_PATH, path)) return;
    wcscat_s(path, L"BlinkTaskbar.log");
    wchar_t msg[512];
    va_list args;
    va_start(args, fmt);
    vswprintf_s(msg, fmt, args);
    va_end(args);
    wchar_t line[640];
    swprintf_s(line, L"[pid %lu] %s\r\n", GetCurrentProcessId(), msg);
    HANDLE f = CreateFileW(path, FILE_APPEND_DATA, FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr, OPEN_ALWAYS, 0, nullptr);
    if (f == INVALID_HANDLE_VALUE) return;
    char utf8[1024];
    const int n = WideCharToMultiByte(CP_UTF8, 0, line, -1, utf8, sizeof(utf8), nullptr, nullptr);
    DWORD written;
    if (n > 1) WriteFile(f, utf8, n - 1, &written, nullptr);
    CloseHandle(f);
}

// ---------------------------------------------------------------------------
// Style settings, stored in the registry so Explorer-side code can read them.
// ---------------------------------------------------------------------------

enum Mode : DWORD { Default = 0, Clear = 1, Blur = 2, Acrylic = 3, Solid = 4 };

struct Style
{
    DWORD mode = Default;
    DWORD argb = 0x00000000;
    DWORD blur = 16; // Gaussian blur standard deviation (0-60)
};

static Style ReadStyle()
{
    Style s;
    DWORD size = sizeof(DWORD);
    RegGetValueW(HKEY_CURRENT_USER, REG_KEY, L"Mode", RRF_RT_REG_DWORD, nullptr, &s.mode, &size);
    size = sizeof(DWORD);
    RegGetValueW(HKEY_CURRENT_USER, REG_KEY, L"Color", RRF_RT_REG_DWORD, nullptr, &s.argb, &size);
    size = sizeof(DWORD);
    RegGetValueW(HKEY_CURRENT_USER, REG_KEY, L"Blur", RRF_RT_REG_DWORD, nullptr, &s.blur, &size);
    return s;
}

// ---------------------------------------------------------------------------
// Window composition (SetWindowCompositionAttribute, exported by user32.dll)
// ---------------------------------------------------------------------------

struct ACCENT_POLICY { int AccentState; int AccentFlags; DWORD GradientColor; int AnimationId; };
struct WINDOWCOMPOSITIONATTRIBDATA { int Attrib; PVOID pvData; SIZE_T cbData; };
using PFN_SWCA = BOOL(WINAPI*)(HWND, WINDOWCOMPOSITIONATTRIBDATA*);

static void ApplyAccent(HWND hwnd, const Style& s)
{
    static const auto swca = reinterpret_cast<PFN_SWCA>(
        GetProcAddress(GetModuleHandleW(L"user32.dll"), "SetWindowCompositionAttribute"));
    if (!swca) return;

    // Settings are stored as ARGB; the accent policy expects ABGR.
    const DWORD a = (s.argb >> 24) & 0xFF, r = (s.argb >> 16) & 0xFF, g = (s.argb >> 8) & 0xFF, b = s.argb & 0xFF;
    const DWORD abgr = (a << 24) | (b << 16) | (g << 8) | r;

    ACCENT_POLICY policy{};
    switch (s.mode)
    {
    case Clear:   policy = { 2, 2, 0x00000000, 0 }; break;          // fully transparent window
    // Blur and Acrylic keep the window transparent; BlurBrush renders the effect.
    case Blur:    policy = { 2, 2, 0x00000000, 0 }; break;
    case Acrylic: policy = { 2, 2, 0x00000000, 0 }; break;
    case Solid:   policy = { 2, 2, abgr, 0 }; break;
    default:      policy = { 0, 0, 0, 0 }; break;                   // Explorer's default rendering
    }
    WINDOWCOMPOSITIONATTRIBDATA data{ 19 /* WCA_ACCENT_POLICY */, &policy, sizeof(policy) };
    const BOOL ok = swca(hwnd, &data);
    if (g_verbose) Log(L"SWCA hwnd=%p state=%d color=0x%08X ok=%d err=%lu", hwnd, policy.AccentState, policy.GradientColor, ok, GetLastError());
}

static void ApplyAccentAllTaskbars(const Style& s)
{
    EnumWindows([](HWND hwnd, LPARAM lp) -> BOOL {
        wchar_t cls[64];
        if (GetClassNameW(hwnd, cls, 64) &&
            (wcscmp(cls, L"Shell_TrayWnd") == 0 || wcscmp(cls, L"Shell_SecondaryTrayWnd") == 0))
        {
            ApplyAccent(hwnd, *reinterpret_cast<const Style*>(lp));
        }
        return TRUE;
    }, reinterpret_cast<LPARAM>(&s));
}

// ---------------------------------------------------------------------------
// Blur brush: backdrop -> Gaussian blur -> colour tint, built with
// Windows.UI.Composition effects. Used because the system blur and acrylic
// accent states do not render on the Windows 11 taskbar.
// ---------------------------------------------------------------------------

namespace wge = winrt::Windows::Graphics::Effects;
namespace awge = ABI::Windows::Graphics::Effects;
namespace wuc = winrt::Windows::UI::Composition;

// Generic description of a built-in Direct2D effect for the composition effect factory.
struct D2DEffect : winrt::implements<D2DEffect, wge::IGraphicsEffect, wge::IGraphicsEffectSource, awge::IGraphicsEffectD2D1Interop>
{
    GUID id{};
    std::vector<winrt::Windows::Foundation::IInspectable> props; // indexed by D2D property id
    std::vector<wge::IGraphicsEffectSource> sources;

    winrt::hstring Name() { return m_name; }
    void Name(winrt::hstring name) { m_name = name; }

    HRESULT STDMETHODCALLTYPE GetEffectId(GUID* out) noexcept override { *out = id; return S_OK; }
    HRESULT STDMETHODCALLTYPE GetNamedPropertyMapping(LPCWSTR, UINT*, awge::GRAPHICS_EFFECT_PROPERTY_MAPPING*) noexcept override { return E_INVALIDARG; }
    HRESULT STDMETHODCALLTYPE GetPropertyCount(UINT* count) noexcept override { *count = static_cast<UINT>(props.size()); return S_OK; }
    HRESULT STDMETHODCALLTYPE GetProperty(UINT index, ABI::Windows::Foundation::IPropertyValue** value) noexcept override
    {
        if (index >= props.size()) return E_BOUNDS;
        return winrt::get_unknown(props[index])->QueryInterface(__uuidof(ABI::Windows::Foundation::IPropertyValue), reinterpret_cast<void**>(value));
    }
    HRESULT STDMETHODCALLTYPE GetSource(UINT index, awge::IGraphicsEffectSource** source) noexcept override
    {
        if (index >= sources.size()) return E_BOUNDS;
        winrt::copy_to_abi(sources[index], *reinterpret_cast<void**>(source));
        return S_OK;
    }
    HRESULT STDMETHODCALLTYPE GetSourceCount(UINT* count) noexcept override { *count = static_cast<UINT>(sources.size()); return S_OK; }

private:
    winrt::hstring m_name = L"D2DEffect";
};

struct BlurBrush : wux::Media::XamlCompositionBrushBaseT<BlurBrush>
{
    BlurBrush(wuc::Compositor compositor, float amount, winrt::Windows::UI::Color tint)
        : m_compositor(std::move(compositor)), m_amount(amount), m_tint(tint) {}

    void OnConnected()
    {
        if (CompositionBrush()) return;
        using PV = winrt::Windows::Foundation::PropertyValue;

        auto blur = winrt::make_self<D2DEffect>();
        blur->id = CLSID_D2D1GaussianBlur;
        blur->Name(L"Blur");
        blur->props = { PV::CreateSingle(m_amount),
                        PV::CreateUInt32(D2D1_GAUSSIANBLUR_OPTIMIZATION_BALANCED),
                        PV::CreateUInt32(D2D1_BORDER_MODE_HARD) };
        blur->sources = { wuc::CompositionEffectSourceParameter(L"backdrop") };

        auto flood = winrt::make_self<D2DEffect>();
        flood->id = CLSID_D2D1Flood;
        flood->Name(L"Tint");
        flood->props = { PV::CreateSingleArray({ m_tint.R / 255.0f, m_tint.G / 255.0f, m_tint.B / 255.0f, m_tint.A / 255.0f }) };

        auto composite = winrt::make_self<D2DEffect>();
        composite->id = CLSID_D2D1Composite;
        composite->Name(L"Composite");
        composite->props = { PV::CreateUInt32(D2D1_COMPOSITE_MODE_SOURCE_OVER) };
        composite->sources = { *blur, *flood };

        Log(L"BlurBrush::OnConnected amount=%.1f", m_amount);
        try {
        auto brush = m_compositor.CreateEffectFactory(*composite).CreateBrush();
        brush.SetSourceParameter(L"backdrop", m_compositor.CreateBackdropBrush());
        CompositionBrush(brush);
        Log(L"BlurBrush ready");
        } catch (const winrt::hresult_error& e) { Log(L"BlurBrush failed 0x%08X %s", static_cast<unsigned>(e.code()), e.message().c_str()); }
    }

    void OnDisconnected()
    {
        if (auto brush = CompositionBrush())
        {
            brush.Close();
            CompositionBrush(nullptr);
        }
    }

private:
    wuc::Compositor m_compositor;
    float m_amount;
    winrt::Windows::UI::Color m_tint;
};

// ---------------------------------------------------------------------------
// Taskbar background elements and style application
// ---------------------------------------------------------------------------

struct TrackedRect
{
    winrt::weak_ref<wux::Shapes::Rectangle> rect;
    wux::Media::Brush original{ nullptr };
    bool stroke = false;
};

static std::mutex g_rectsLock;
static std::vector<TrackedRect> g_rects;
static winrt::Windows::System::DispatcherQueue g_xamlQueue{ nullptr };

// Must run on the taskbar's XAML thread.
static void ApplyXaml(const Style& s)
{
    std::lock_guard lock(g_rectsLock);
    for (auto it = g_rects.begin(); it != g_rects.end();)
    {
        auto rect = it->rect.get();
        if (!rect) { it = g_rects.erase(it); continue; }

        const winrt::Windows::UI::Color tint{
            static_cast<uint8_t>(s.argb >> 24), static_cast<uint8_t>(s.argb >> 16),
            static_cast<uint8_t>(s.argb >> 8), static_cast<uint8_t>(s.argb) };

        if (s.mode == Default)
            rect.Fill(it->original);
        else if (s.mode == Solid && !it->stroke)
            rect.Fill(wux::Media::SolidColorBrush(tint));
        else if ((s.mode == Blur || s.mode == Acrylic) && !it->stroke)
        {
            auto compositor = wux::Hosting::ElementCompositionPreview::GetElementVisual(rect).Compositor();
            rect.Fill(winrt::make<BlurBrush>(compositor, static_cast<float>(s.blur),
                s.mode == Blur ? winrt::Windows::UI::Colors::Transparent() : tint));
        }
        else
            // Clear mode, and the border line in every styled mode.
            rect.Fill(wux::Media::SolidColorBrush(winrt::Windows::UI::Colors::Transparent()));
        ++it;
    }
}

static bool IsInsideTaskbarFrame(wux::DependencyObject element)
{
    while (element)
    {
        if (auto fe = element.try_as<wux::FrameworkElement>(); fe && fe.Name() == L"TaskbarFrame")
            return true;
        element = wux::Media::VisualTreeHelper::GetParent(element);
    }
    return false;
}

struct VisualTreeWatcher : winrt::implements<VisualTreeWatcher, IVisualTreeServiceCallback2>
{
    explicit VisualTreeWatcher(winrt::com_ptr<IXamlDiagnostics> diag) : m_diag(std::move(diag)) {}

    HRESULT STDMETHODCALLTYPE OnVisualTreeChange(ParentChildRelation, VisualElement element, VisualMutationType mutation) noexcept override
    {
        // The callee owns these strings and must free them.
        const std::wstring type = element.Type ? element.Type : L"";
        const std::wstring name = element.Name ? element.Name : L"";
        SysFreeString(element.SrcInfo.FileName);
        SysFreeString(element.SrcInfo.Hash);
        SysFreeString(element.Type);
        SysFreeString(element.Name);

        try
        {
            if (!g_xamlQueue)
                g_xamlQueue = winrt::Windows::System::DispatcherQueue::GetForCurrentThread();

            if (mutation == Add && type == L"Windows.UI.Xaml.Shapes.Rectangle" &&
                (name == L"BackgroundFill" || name == L"BackgroundStroke"))
            {
                winrt::com_ptr<::IInspectable> insp;
                if (FAILED(m_diag->GetIInspectableFromHandle(element.Handle, insp.put()))) return S_OK;
                const auto rect = insp.as<wux::Shapes::Rectangle>();
                if (!IsInsideTaskbarFrame(rect)) return S_OK;

                {
                    std::lock_guard lock(g_rectsLock);
                    g_rects.push_back({ winrt::make_weak(rect), rect.Fill(), name == L"BackgroundStroke" });
                    Log(L"Tracked %s (total %zu)", name.c_str(), g_rects.size());
                }
                ApplyXaml(ReadStyle());
            }
        }
        catch (...) {}
        return S_OK;
    }

    HRESULT STDMETHODCALLTYPE OnElementStateChanged(InstanceHandle, VisualElementState, LPCWSTR) noexcept override
    {
        return S_OK;
    }

private:
    winrt::com_ptr<IXamlDiagnostics> m_diag;
};

// ---------------------------------------------------------------------------
// COM object created by XAML Diagnostics inside Explorer
// ---------------------------------------------------------------------------

static winrt::com_ptr<VisualTreeWatcher> g_watcher;

struct Site : winrt::implements<Site, IObjectWithSite>
{
    HRESULT STDMETHODCALLTYPE SetSite(IUnknown* site) noexcept override
    {
        Log(L"SetSite %p", site);
        m_site.copy_from(site);
        if (!site || g_watcher) return S_OK;
        try
        {
            auto diag = m_site.as<IXamlDiagnostics>();
            g_watcher = winrt::make_self<VisualTreeWatcher>(diag);
            // Subscribe from a worker thread to avoid blocking the XAML thread.
            std::thread([diag, watcher = g_watcher] {
                winrt::init_apartment(winrt::apartment_type::multi_threaded);
                const HRESULT adv = diag.as<IVisualTreeService3>()->AdviseVisualTreeChange(watcher.get());
                Log(L"AdviseVisualTreeChange hr=0x%08X", static_cast<unsigned>(adv));
                if (SUCCEEDED(adv))
                {
                    // Deliberately left open so the event lives as long as Explorer,
                    // letting later BB_Inject() calls detect an existing session.
                    if (HANDLE ready = CreateEventW(nullptr, TRUE, FALSE, READY_EVENT))
                        SetEvent(ready);
                }
            }).detach();
        }
        catch (...) { return winrt::to_hresult(); }
        return S_OK;
    }

    HRESULT STDMETHODCALLTYPE GetSite(REFIID riid, void** ppv) noexcept override
    {
        if (!m_site) { *ppv = nullptr; return E_FAIL; }
        return m_site->QueryInterface(riid, ppv);
    }

private:
    winrt::com_ptr<IUnknown> m_site;
};

struct SiteFactory : winrt::implements<SiteFactory, IClassFactory>
{
    HRESULT STDMETHODCALLTYPE CreateInstance(IUnknown* outer, REFIID riid, void** ppv) noexcept override
    {
        if (outer) return CLASS_E_NOAGGREGATION;
        try { return winrt::make<Site>().as<IUnknown>()->QueryInterface(riid, ppv); }
        catch (...) { return winrt::to_hresult(); }
    }
    HRESULT STDMETHODCALLTYPE LockServer(BOOL) noexcept override { return S_OK; }
};

extern "C" HRESULT STDAPICALLTYPE BB_DllGetClassObject(REFCLSID clsid, REFIID riid, void** ppv)
{
    Log(L"DllGetClassObject called");
    if (clsid != CLSID_BlinkSite) return CLASS_E_CLASSNOTAVAILABLE;
    try { return winrt::make<SiteFactory>().as<IUnknown>()->QueryInterface(riid, ppv); }
    catch (...) { return winrt::to_hresult(); }
}

extern "C" HRESULT STDAPICALLTYPE BB_DllCanUnloadNow() { return S_FALSE; }

// ---------------------------------------------------------------------------
// Explorer side: start-up and refresh loop
// ---------------------------------------------------------------------------

static void RefreshLoop()
{
    HANDLE refresh = CreateEventW(nullptr, FALSE, FALSE, REFRESH_EVENT);
    for (;;)
    {
        const bool signaled = WaitForSingleObject(refresh, 1000) == WAIT_OBJECT_0;
        const Style s = ReadStyle();

        // Explorer resets window composition on various events, so re-apply it periodically.
        if (s.mode != Default || signaled)
        {
            g_verbose = signaled;
            ApplyAccentAllTaskbars(s);
        }

        if (signaled && g_xamlQueue)
            g_xamlQueue.TryEnqueue([s] { try { ApplyXaml(s); } catch (const winrt::hresult_error& e) { Log(L"ApplyXaml failed 0x%08X %s", static_cast<unsigned>(e.code()), e.message().c_str()); } });
    }
}

// 0 = idle, 1 = attaching, 2 = attached
static std::atomic<int> g_installState{ 0 };

static DWORD WINAPI Install(void*)
{
    // Keep the module loaded after BlinkBreak removes its hook.
    HMODULE self = nullptr;
    GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_PIN | GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS,
                       reinterpret_cast<LPCWSTR>(&Install), &self);

    wchar_t path[MAX_PATH];
    GetModuleFileNameW(g_module, path, MAX_PATH);

    HMODULE wux = LoadLibraryExW(L"Windows.UI.Xaml.dll", nullptr, LOAD_LIBRARY_SEARCH_SYSTEM32);
    using PFN_IXDE = HRESULT(WINAPI*)(LPCWSTR, DWORD, LPCWSTR, LPCWSTR, CLSID, LPCWSTR);
    auto ixde = wux ? reinterpret_cast<PFN_IXDE>(GetProcAddress(wux, "InitializeXamlDiagnosticsEx")) : nullptr;
    Log(L"Install: Windows.UI.Xaml=%p InitializeXamlDiagnosticsEx=%p", wux, ixde);
    if (!ixde) { g_installState = 0; return 1; }

    // The taskbar's XAML may not be ready immediately, so retry for up to a minute.
    HRESULT hr = E_FAIL;
    static int s_connection = 0; // endpoint names must be unique across attempts
    for (int attempt = 1; attempt <= 120 && FAILED(hr); ++attempt)
    {
        // XAML Diagnostics requires this endpoint name prefix.
        const std::wstring conn = L"VisualDiagConnection" + std::to_wstring(++s_connection);
        std::thread([&] { hr = ixde(conn.c_str(), GetCurrentProcessId(), nullptr, path, CLSID_BlinkSite, nullptr); }).join();
        if (FAILED(hr)) Sleep(500);
    }
    Log(L"Install: InitializeXamlDiagnosticsEx hr=0x%08X", static_cast<unsigned>(hr));
    if (FAILED(hr)) { g_installState = 0; return 2; } // the next BB_Inject() retries

    g_installState = 2;
    RefreshLoop();
    return 0;
}

static void StartInstall()
{
    int idle = 0;
    if (!g_installState.compare_exchange_strong(idle, 1)) return; // already attaching or attached
    if (HANDLE t = CreateThread(nullptr, 0, Install, nullptr, 0, nullptr)) CloseHandle(t);
    else g_installState = 0;
}

static bool InExplorer()
{
    wchar_t exe[MAX_PATH];
    GetModuleFileNameW(nullptr, exe, MAX_PATH);
    const wchar_t* name = wcsrchr(exe, L'\\');
    return name && _wcsicmp(name + 1, L"explorer.exe") == 0;
}

BOOL WINAPI DllMain(HINSTANCE instance, DWORD reason, LPVOID)
{
    if (reason == DLL_PROCESS_ATTACH)
    {
        g_module = instance;
        { wchar_t exe[MAX_PATH]; GetModuleFileNameW(nullptr, exe, MAX_PATH); Log(L"DllMain attach in %s", exe); }
        DisableThreadLibraryCalls(instance);
        if (InExplorer()) StartInstall();
    }
    return TRUE;
}

// ---------------------------------------------------------------------------
// BlinkBreak side: exported API
// ---------------------------------------------------------------------------

// Runs inside Explorer for each BB_Inject() call. DllMain only runs on first
// load, so this also restarts a previous attach attempt that failed.
static LRESULT CALLBACK HookProc(int code, WPARAM wp, LPARAM lp)
{
    static const bool inExplorer = InExplorer();
    if (inExplorer) StartInstall();
    return CallNextHookEx(nullptr, code, wp, lp);
}

// Attaches the engine to the running Explorer.
// Returns 0 on success or if already attached; otherwise:
//   -1 taskbar not found, -2 event creation failed, -3 hook failed,
//   -4 timed out, -5 Explorer is still starting (retry later).
extern "C" __declspec(dllexport) int BB_Inject()
{
    HWND taskbar = FindWindowW(L"Shell_TrayWnd", nullptr);
    if (!taskbar) return -1;

    HANDLE ready = CreateEventW(nullptr, TRUE, FALSE, READY_EVENT);
    if (!ready) return -2;
    if (WaitForSingleObject(ready, 0) == WAIT_OBJECT_0)
    {
        CloseHandle(ready); // already attached to this Explorer instance
        return 0;
    }

    DWORD pid = 0;
    const DWORD tid = GetWindowThreadProcessId(taskbar, &pid);

    // Attaching to an Explorer instance that is still starting up fails for
    // the rest of that session, so wait until the taskbar has fully loaded.
    if (!FindWindowExW(taskbar, nullptr, L"Windows.UI.Composition.DesktopWindowContentBridge", nullptr))
    {
        CloseHandle(ready);
        return -5;
    }
    if (HANDLE proc = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid))
    {
        FILETIME created, exited, kernel, user, now;
        const bool ok = GetProcessTimes(proc, &created, &exited, &kernel, &user);
        CloseHandle(proc);
        GetSystemTimeAsFileTime(&now);
        const auto ticks = [](FILETIME f) { return (static_cast<ULONGLONG>(f.dwHighDateTime) << 32) | f.dwLowDateTime; };
        if (ok && ticks(now) - ticks(created) < 20ULL * 10'000'000ULL) // 20 seconds in 100 ns units
        {
            CloseHandle(ready);
            return -5;
        }
    }

    HHOOK hook = SetWindowsHookExW(WH_CALLWNDPROC, HookProc, g_module, tid);
    Log(L"BB_Inject: taskbar=%p pid=%lu tid=%lu hook=%p err=%lu", taskbar, pid, tid, hook, GetLastError());
    if (!hook) { CloseHandle(ready); return -3; }

    // Send a message so the hook, and with it the DLL, loads immediately.
    DWORD_PTR ignored;
    SendMessageTimeoutW(taskbar, WM_NULL, 0, 0, SMTO_ABORTIFHUNG, 1000, &ignored);

    const DWORD wait = WaitForSingleObject(ready, 15000);
    Log(L"BB_Inject: wait=%lu", wait);
    UnhookWindowsHookEx(hook);
    // Explorer keeps its own handle, so the event ends with that Explorer
    // instance and a restarted Explorer is attached again.
    CloseHandle(ready);
    return wait == WAIT_OBJECT_0 ? 0 : -4;
}

// Stores a new style and tells the engine to apply it.
// mode: 0 Default, 1 Clear, 2 Blur, 3 Acrylic, 4 Solid; argb: tint colour;
// blur: blur strength (0-60).
extern "C" __declspec(dllexport) int BB_SetStyle(DWORD mode, DWORD argb, DWORD blur)
{
    HKEY key;
    if (RegCreateKeyExW(HKEY_CURRENT_USER, REG_KEY, 0, nullptr, 0, KEY_SET_VALUE, nullptr, &key, nullptr) != ERROR_SUCCESS)
        return -1;
    RegSetValueExW(key, L"Mode", 0, REG_DWORD, reinterpret_cast<const BYTE*>(&mode), sizeof(mode));
    RegSetValueExW(key, L"Color", 0, REG_DWORD, reinterpret_cast<const BYTE*>(&argb), sizeof(argb));
    RegSetValueExW(key, L"Blur", 0, REG_DWORD, reinterpret_cast<const BYTE*>(&blur), sizeof(blur));
    RegCloseKey(key);

    if (HANDLE refresh = OpenEventW(EVENT_MODIFY_STATE, FALSE, REFRESH_EVENT))
    {
        SetEvent(refresh);
        CloseHandle(refresh);
    }
    return 0;
}
