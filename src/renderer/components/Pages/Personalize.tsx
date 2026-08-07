import { useState, useEffect } from 'react'

export default function Personalize() {
  // Monitor controls
  const [brightness, setBrightness] = useState(70)
  const [contrast, setContrast] = useState(75)
  const [blueLightFilter, setBlueLightFilter] = useState(false)
  const [blueLightIntensity, setBlueLightIntensity] = useState(30)

  // Color Mask controls
  const [colorMask, setColorMask] = useState(false)
  const [maskIntensity, setMaskIntensity] = useState(30)
  const [selectedColorIndex, setSelectedColorIndex] = useState(0)

  // Color presets
  const colorPresets = [
    { name: 'Green', rgb: [34, 197, 94] },
    { name: 'Magenta', rgb: [255, 0, 255] },
    { name: 'Purple', rgb: [147, 51, 234] },
    { name: 'Blue', rgb: [59, 130, 246] },
    { name: 'Cyan', rgb: [6, 182, 212] },
    { name: 'Yellow', rgb: [234, 179, 8] },
    { name: 'Orange', rgb: [249, 115, 22] },
    { name: 'Red', rgb: [239, 68, 68] },
    { name: 'Pink', rgb: [236, 72, 153] },
    { name: 'Warm', rgb: [255, 147, 41] }
  ]

  // Load settings on mount
  useEffect(() => {
    window.electronAPI.getSettings().then((settings) => {
      setBlueLightFilter(settings.blueLightFilter.enabled)
      setBlueLightIntensity(settings.blueLightFilter.intensity)

      setColorMask(settings.colorMask.enabled)
      setMaskIntensity(settings.colorMask.intensity)

      // Find matching color preset
      const matchingIndex = colorPresets.findIndex(
        preset => preset.rgb[0] === settings.colorMask.red &&
          preset.rgb[1] === settings.colorMask.green &&
          preset.rgb[2] === settings.colorMask.blue
      )
      setSelectedColorIndex(matchingIndex >= 0 ? matchingIndex : 0)
    })

    // Load current monitor brightness
    window.electronAPI.getMonitorBrightness().then((value) => {
      setBrightness(value)
    }).catch(() => {
      console.log('Could not get monitor brightness')
    })
  }, [])

  // Handle blue light filter toggle
  const handleBlueLightToggle = () => {
    const newState = !blueLightFilter
    setBlueLightFilter(newState)

    if (newState) {
      window.electronAPI.enableBlueLightFilter(blueLightIntensity)
    } else {
      window.electronAPI.disableBlueLightFilter()
    }
  }

  // Handle intensity change
  const handleIntensityChange = (value: number) => {
    setBlueLightIntensity(value)
    if (blueLightFilter) {
      window.electronAPI.updateBlueLightIntensity(value)
    }
  }

  // Handle color mask toggle
  const handleColorMaskToggle = () => {
    const newState = !colorMask
    setColorMask(newState)

    if (newState) {
      const [r, g, b] = colorPresets[selectedColorIndex].rgb
      window.electronAPI.enableColorMask(maskIntensity, r, g, b)
    } else {
      window.electronAPI.disableColorMask()
    }
  }

  // Handle color mask intensity change
  const handleMaskIntensityChange = (value: number) => {
    setMaskIntensity(value)
    if (colorMask) {
      const [r, g, b] = colorPresets[selectedColorIndex].rgb
      window.electronAPI.updateColorMask(value, r, g, b)
    }
  }

  // Handle color selection change
  const handleColorChange = (index: number) => {
    setSelectedColorIndex(index)
    if (colorMask) {
      const [r, g, b] = colorPresets[index].rgb
      window.electronAPI.updateColorMask(maskIntensity, r, g, b)
    }
  }

  const brightnessPresets = [
    { name: 'Outdoor', brightness: 100, contrast: 85, description: 'Maximum for bright sunlight' },
    { name: 'Indoor', brightness: 70, contrast: 75, description: 'Comfortable for indoor use' },
    { name: 'Evening', brightness: 50, contrast: 70, description: 'Reduced for evening' },
    { name: 'Night Mode', brightness: 30, contrast: 65, description: 'Low brightness for night' },
    { name: 'Dim', brightness: 5, contrast: 50, description: 'Very low for dark environments' }
  ]

  const applyPreset = (preset: typeof brightnessPresets[0]) => {
    setBrightness(preset.brightness)
    setContrast(preset.contrast)

    // Apply to actual monitor
    window.electronAPI.setMonitorBrightness(preset.brightness)
    window.electronAPI.setMonitorContrast(preset.contrast)
  }

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-12 h-6 rounded-full relative transition-colors ${enabled ? 'bg-primary' : 'bg-muted'
        }`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${enabled ? 'right-0.5' : 'left-0.5'
          }`}
      ></div>
    </button>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Personalize</h2>
        <p className="text-muted-foreground">Customize your desktop and monitor settings</p>
      </div>

      {/* Monitor Controls */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Monitor Controls</h3>

        {/* Presets */}
        <div className="mb-6">
          <label className="text-foreground font-medium mb-3 block">Quick Presets</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {brightnessPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="p-3 bg-muted rounded-lg hover:bg-primary/10 hover:border-primary border-2 border-transparent text-left transition-all"
              >
                <div className="font-semibold text-foreground text-sm">{preset.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Controls */}
        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-foreground font-medium">Brightness</label>
              <span className="text-primary font-semibold">{brightness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={brightness}
              onChange={(e) => {
                const value = Number(e.target.value)
                setBrightness(value)
                window.electronAPI.setMonitorBrightness(value)
              }}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Dark</span>
              <span>Bright</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-foreground font-medium">Contrast</label>
              <span className="text-primary font-semibold">{contrast}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={contrast}
              onChange={(e) => {
                const value = Number(e.target.value)
                setContrast(value)
                window.electronAPI.setMonitorContrast(value)
              }}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 If brightness control doesn't work on your monitor, switch it from Eye Care/Reader mode to Normal/Standard mode in the monitor's OSD menu. Special display modes often disable DDC/CI communication.
          </p>
        </div>
      </div>

      {/* Blue Light Filter */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Blue Light Filter</h3>
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-foreground font-medium">Enable Blue Light Filter</div>
              <div className="text-sm text-muted-foreground">Reduce eye strain with warm colors</div>
            </div>
            <Toggle enabled={blueLightFilter} onChange={handleBlueLightToggle} />
          </div>
          {blueLightFilter && (
            <div className="ml-0 mt-4">
              <div className="flex justify-between mb-2">
                <label className="text-foreground font-medium">Filter Intensity</label>
                <span className="text-primary font-semibold">{blueLightIntensity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={blueLightIntensity}
                onChange={(e) => handleIntensityChange(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Subtle</span>
                <span>Strong</span>
              </div>

              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  🌙 Blue light filter reduces blue wavelengths that can disrupt sleep and cause eye fatigue
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Color Mask */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Color Mask</h3>
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-foreground font-medium">Apply Custom Color Mask</div>
              <div className="text-sm text-muted-foreground">Add color overlay to your screen</div>
            </div>
            <Toggle enabled={colorMask} onChange={handleColorMaskToggle} />
          </div>
          {colorMask && (
            <div className="ml-0 mt-4 space-y-4">
              {/* Intensity Slider */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-foreground font-medium">Mask Intensity</label>
                  <span className="text-primary font-semibold">{maskIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={maskIntensity}
                  onChange={(e) => handleMaskIntensityChange(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Subtle</span>
                  <span>Strong</span>
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label className="text-foreground font-medium mb-3 block">Choose Color</label>
                <div className="grid grid-cols-5 gap-3">
                  {colorPresets.map((preset, index) => (
                    <button
                      key={preset.name}
                      onClick={() => handleColorChange(index)}
                      className={`relative p-3 rounded-lg transition-all ${selectedColorIndex === index
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : 'hover:ring-2 hover:ring-muted'
                        }`}
                      style={{ backgroundColor: `rgb(${preset.rgb[0]}, ${preset.rgb[1]}, ${preset.rgb[2]})` }}
                    >
                      <div className="h-8"></div>
                      {selectedColorIndex === index && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-primary rounded-full"></div>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-3 mt-2">
                  {colorPresets.map((preset) => (
                    <div key={preset.name} className="text-center text-xs text-muted-foreground">
                      {preset.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  🎨 Choose from preset colors for different moods or lighting conditions
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Windows Theme Customization - Coming Soon */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Windows Theme</h3>
        <div className="p-8 bg-muted/30 rounded-lg border-2 border-dashed border-muted text-center">
          <div className="text-4xl mb-3">🎨</div>
          <div className="text-foreground font-medium mb-2">Theme Customization</div>
          <div className="text-sm text-muted-foreground">
            Customize Windows taskbar, colors, and appearance
          </div>
          <div className="text-xs text-muted-foreground mt-2 opacity-70">Coming Soon</div>
        </div>
      </div>

      {/* Dynamic Desktop - Coming Soon */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Dynamic Desktop</h3>
        <div className="p-8 bg-muted/30 rounded-lg border-2 border-dashed border-muted text-center">
          <div className="text-4xl mb-3">🖼️</div>
          <div className="text-foreground font-medium mb-2">Smart Wallpaper System</div>
          <div className="text-sm text-muted-foreground mb-3">
            Create dynamic wallpapers with live data integration
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground max-w-md mx-auto">
            <div className="p-2 bg-background/50 rounded">📧 Email widgets</div>
            <div className="p-2 bg-background/50 rounded">💻 GitHub stats</div>
            <div className="p-2 bg-background/50 rounded">🌐 Web data feeds</div>
            <div className="p-2 bg-background/50 rounded">📊 Custom APIs</div>
          </div>
          <div className="text-xs text-muted-foreground mt-3 opacity-70">Coming Soon</div>
        </div>
      </div>

      {/* Desktop Widgets - Coming Soon */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Desktop Widgets</h3>
        <div className="p-8 bg-muted/30 rounded-lg border-2 border-dashed border-muted text-center">
          <div className="text-4xl mb-3">📱</div>
          <div className="text-foreground font-medium mb-2">Interactive Desktop Widgets</div>
          <div className="text-sm text-muted-foreground">
            Add customizable widgets to your desktop
          </div>
          <div className="text-xs text-muted-foreground mt-2 opacity-70">Coming Soon</div>
        </div>
      </div>

      {/* Taskbar Customization - Coming Soon */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Taskbar Customization</h3>
        <div className="p-8 bg-muted/30 rounded-lg border-2 border-dashed border-muted text-center">
          <div className="text-4xl mb-3">⚙️</div>
          <div className="text-foreground font-medium mb-2">Custom Taskbar</div>
          <div className="text-sm text-muted-foreground">
            Personalize Windows taskbar appearance and behavior
          </div>
          <div className="text-xs text-muted-foreground mt-2 opacity-70">Coming Soon</div>
        </div>
      </div>
    </div>
  )
}
